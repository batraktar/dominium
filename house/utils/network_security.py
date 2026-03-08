from __future__ import annotations

import ipaddress
import socket
from functools import lru_cache
from urllib.parse import urljoin, urlparse

import requests
from django.conf import settings


class UnsafeImportURLError(ValueError):
    """URL cannot be used for import due to SSRF hardening rules."""


class ImportPayloadTooLargeError(ValueError):
    """Remote payload exceeds configured import size limit."""


class ImportContentTypeError(ValueError):
    """Remote payload content type is not allowed."""


_BLOCKED_HOSTNAMES = {
    "",
    "localhost",
    "localhost.localdomain",
    "0",
    "0.0.0.0",
    "::",
    "::1",
}


def _normalize_host(host: str | None) -> str:
    return (host or "").strip().lower().rstrip(".")


def _iter_allowed_hosts(setting_name: str = "IMPORT_ALLOWED_HOSTS") -> list[str]:
    raw = getattr(settings, setting_name, []) or []
    return [str(item).strip().lower() for item in raw if str(item).strip()]


def _resolve_allowed_hosts(url_kind: str = "html") -> tuple[list[str], str]:
    normalized_kind = (url_kind or "html").strip().lower()
    if normalized_kind == "image":
        image_hosts = _iter_allowed_hosts("IMPORT_ALLOWED_IMAGE_HOSTS")
        if image_hosts:
            return image_hosts, "IMPORT_ALLOWED_IMAGE_HOSTS"
    return _iter_allowed_hosts("IMPORT_ALLOWED_HOSTS"), "IMPORT_ALLOWED_HOSTS"


def _host_matches_pattern(host: str, pattern: str) -> bool:
    pattern = pattern.strip().lower()
    if not pattern:
        return False

    if pattern.startswith("*."):
        suffix = pattern[1:]
        return host.endswith(suffix)
    if pattern.startswith("."):
        return host == pattern[1:] or host.endswith(pattern)
    return host == pattern


def _is_blocked_ip(value: ipaddress._BaseAddress) -> bool:
    return (
        value.is_private
        or value.is_loopback
        or value.is_link_local
        or value.is_multicast
        or value.is_reserved
        or value.is_unspecified
    )


@lru_cache(maxsize=512)
def _resolve_host_ips(host: str) -> tuple[str, ...]:
    try:
        addr_info = socket.getaddrinfo(host, None, proto=socket.IPPROTO_TCP)
    except socket.gaierror as exc:
        raise UnsafeImportURLError(f"Cannot resolve import host '{host}'.") from exc

    ips: set[str] = set()
    for item in addr_info:
        sockaddr = item[4]
        if not sockaddr:
            continue
        candidate = sockaddr[0]
        if candidate:
            ips.add(candidate)
    if not ips:
        raise UnsafeImportURLError(f"Cannot resolve import host '{host}'.")
    return tuple(sorted(ips))


def _is_public_host(host: str) -> bool:
    normalized = _normalize_host(host)
    if normalized in _BLOCKED_HOSTNAMES:
        return False
    if normalized.endswith(".local") or normalized.endswith(".internal"):
        return False

    try:
        direct_ip = ipaddress.ip_address(normalized)
    except ValueError:
        direct_ip = None

    if direct_ip is not None:
        return not _is_blocked_ip(direct_ip)

    resolved = _resolve_host_ips(normalized)
    for ip_text in resolved:
        ip_obj = ipaddress.ip_address(ip_text)
        if _is_blocked_ip(ip_obj):
            return False
    return True


def ensure_safe_import_url(url: str, *, url_kind: str = "html") -> str:
    parsed = urlparse((url or "").strip())
    if parsed.scheme not in {"http", "https"}:
        raise UnsafeImportURLError("Import URL must use http/https.")
    if not parsed.netloc:
        raise UnsafeImportURLError("Import URL must include a host.")
    if parsed.username or parsed.password:
        raise UnsafeImportURLError("Import URL credentials are not allowed.")

    host = _normalize_host(parsed.hostname)
    if not host:
        raise UnsafeImportURLError("Import URL has invalid host.")

    allow_private = bool(getattr(settings, "IMPORT_ALLOW_PRIVATE_HOSTS", False))
    allowed_hosts, allowlist_name = _resolve_allowed_hosts(url_kind=url_kind)
    require_allowlist = bool(getattr(settings, "IMPORT_REQUIRE_ALLOWED_HOSTS", False))
    if require_allowlist and not allowed_hosts:
        raise UnsafeImportURLError(
            f"Import allowlist is not configured. Set {allowlist_name} in environment."
        )
    if allowed_hosts and not any(
        _host_matches_pattern(host, pattern) for pattern in allowed_hosts
    ):
        raise UnsafeImportURLError(
            f"Import URL host '{host}' is not in {allowlist_name}."
        )

    if not allow_private and not _is_public_host(host):
        raise UnsafeImportURLError("Import URL host resolves to a private/local address.")

    return parsed._replace(fragment="").geturl()


def _content_type_allowed(content_type: str, allowed_prefixes: tuple[str, ...]) -> bool:
    if not content_type:
        return True

    normalized = content_type.split(";", 1)[0].strip().lower()
    for prefix in allowed_prefixes:
        expected = prefix.strip().lower()
        if not expected:
            continue
        if normalized.startswith(expected):
            return True
    return False


def _read_stream_with_limit(response: requests.Response, max_bytes: int) -> bytes:
    chunks: list[bytes] = []
    total = 0

    for chunk in response.iter_content(chunk_size=64 * 1024):
        if not chunk:
            continue
        total += len(chunk)
        if total > max_bytes:
            raise ImportPayloadTooLargeError(
                f"Payload exceeds configured limit ({max_bytes} bytes)."
            )
        chunks.append(chunk)
    return b"".join(chunks)


def fetch_remote_content(
    url: str,
    *,
    timeout: int,
    max_bytes: int,
    allowed_content_types: tuple[str, ...],
    accept_header: str | None = None,
    url_kind: str = "html",
) -> tuple[bytes, str, str]:
    redirect_limit = max(0, int(getattr(settings, "IMPORT_HTTP_REDIRECT_LIMIT", 3)))
    current_url = ensure_safe_import_url(url, url_kind=url_kind)

    headers = {"User-Agent": "dominium-importer/1.0"}
    if accept_header:
        headers["Accept"] = accept_header

    for _ in range(redirect_limit + 1):
        with requests.get(
            current_url,
            timeout=timeout,
            stream=True,
            allow_redirects=False,
            headers=headers,
        ) as response:
            if 300 <= response.status_code < 400:
                location = response.headers.get("Location")
                if not location:
                    response.raise_for_status()
                current_url = ensure_safe_import_url(
                    urljoin(current_url, location),
                    url_kind=url_kind,
                )
                continue

            response.raise_for_status()
            content_type = (response.headers.get("Content-Type") or "").strip().lower()
            if not _content_type_allowed(content_type, allowed_content_types):
                raise ImportContentTypeError(
                    f"Unsupported content type for import: {content_type or 'unknown'}."
                )

            data = _read_stream_with_limit(response, max_bytes=max_bytes)
            return data, content_type, current_url

    raise UnsafeImportURLError("Too many redirects while fetching import URL.")


def _extract_charset(content_type: str) -> str | None:
    if not content_type:
        return None
    for chunk in content_type.split(";")[1:]:
        key, _, value = chunk.partition("=")
        if key.strip().lower() == "charset" and value.strip():
            return value.strip().strip('"').strip("'")
    return None


def decode_html_payload(raw: bytes, *, content_type: str = "") -> str:
    charset = _extract_charset(content_type)
    candidates = [charset, "utf-8", "cp1251", "windows-1251", "iso-8859-1"]
    seen: set[str] = set()

    for encoding in candidates:
        if not encoding:
            continue
        normalized = encoding.lower()
        if normalized in seen:
            continue
        seen.add(normalized)
        try:
            return raw.decode(encoding)
        except (UnicodeDecodeError, LookupError):
            continue

    return raw.decode("utf-8", errors="replace")


def fetch_import_html(url: str, *, timeout: int) -> tuple[str, str]:
    max_bytes = int(getattr(settings, "IMPORT_MAX_HTML_BYTES", 2 * 1024 * 1024))
    raw, content_type, resolved_url = fetch_remote_content(
        url,
        timeout=timeout,
        max_bytes=max_bytes,
        allowed_content_types=("text/html", "application/xhtml+xml", "text/plain"),
        accept_header="text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        url_kind="html",
    )
    return decode_html_payload(raw, content_type=content_type), resolved_url


def fetch_import_image(url: str, *, timeout: int) -> bytes:
    max_bytes = int(getattr(settings, "IMPORT_MAX_IMAGE_BYTES", 12 * 1024 * 1024))
    raw, content_type, _resolved_url = fetch_remote_content(
        url,
        timeout=timeout,
        max_bytes=max_bytes,
        allowed_content_types=("image/", "application/octet-stream"),
        accept_header="image/avif,image/webp,image/*,*/*;q=0.8",
        url_kind="image",
    )
    normalized = (content_type or "").split(";", 1)[0].strip().lower()
    if normalized and normalized != "application/octet-stream" and not normalized.startswith(
        "image/"
    ):
        raise ImportContentTypeError(f"Unsupported image content type: {content_type}.")
    return raw

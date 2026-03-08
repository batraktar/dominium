import ipaddress
from urllib.parse import urlsplit, urlunsplit

from django.conf import settings
from django.templatetags.static import static

TRACKING_QUERY_PARAM_NAMES = {
    "gclid",
    "fbclid",
    "msclkid",
    "yclid",
    "_ga",
    "_gl",
}
TRACKING_QUERY_PARAM_PREFIXES = ("utm_",)


def _resolved_scheme_and_host(request, *, canonical: bool = False) -> tuple[str, str]:
    scheme = "https" if request.is_secure() else "http"
    host = request.get_host()

    if not canonical:
        return scheme, host

    canonical_scheme = (
        str(getattr(settings, "SEO_CANONICAL_SCHEME", "") or "").strip().lower()
    )
    if canonical_scheme in {"http", "https"}:
        scheme = canonical_scheme

    canonical_host = str(getattr(settings, "SEO_CANONICAL_HOST", "") or "").strip()
    if canonical_host:
        host = canonical_host

    return scheme, host


def _rewrite_absolute_uri(url: str, *, scheme: str, host: str) -> str:
    parsed = urlsplit(url)
    return urlunsplit(
        (
            scheme or parsed.scheme,
            host or parsed.netloc,
            parsed.path or "/",
            parsed.query,
            "",
        )
    )


def build_absolute_uri(
    request, path: str | None = None, *, canonical: bool = False
) -> str:
    if path and path.startswith(("http://", "https://")):
        absolute = path
    else:
        absolute = (
            request.build_absolute_uri(path) if path else request.build_absolute_uri()
        )

    if not canonical:
        return absolute

    scheme, host = _resolved_scheme_and_host(request, canonical=True)
    return _rewrite_absolute_uri(absolute, scheme=scheme, host=host)


def build_canonical_uri(request, path: str | None = None) -> str:
    return build_absolute_uri(request, path, canonical=True)


def _is_tracking_query_param(key: str) -> bool:
    normalized = str(key or "").strip().lower()
    if not normalized:
        return False
    if normalized in TRACKING_QUERY_PARAM_NAMES:
        return True
    return normalized.startswith(TRACKING_QUERY_PARAM_PREFIXES)


def filter_canonical_query_params(
    params,
    *,
    ignored_query_params: set[str] | None = None,
    drop_tracking_params: bool = True,
):
    filtered = params.copy()
    ignored = {
        str(item or "").strip().lower()
        for item in (ignored_query_params or set())
        if str(item or "").strip()
    }

    for key in list(filtered.keys()):
        normalized = str(key or "").strip().lower()
        if normalized in ignored:
            filtered.pop(key, None)
            continue
        if drop_tracking_params and _is_tracking_query_param(normalized):
            filtered.pop(key, None)

    return filtered


def canonical_query_string(
    request,
    *,
    ignored_query_params: set[str] | None = None,
    drop_tracking_params: bool = True,
) -> str:
    filtered = filter_canonical_query_params(
        request.GET,
        ignored_query_params=ignored_query_params,
        drop_tracking_params=drop_tracking_params,
    )
    return filtered.urlencode()


def build_canonical_request_url(
    request,
    *,
    ignored_query_params: set[str] | None = None,
    drop_tracking_params: bool = True,
) -> str:
    query = canonical_query_string(
        request,
        ignored_query_params=ignored_query_params,
        drop_tracking_params=drop_tracking_params,
    )
    if query:
        return build_canonical_uri(request, f"{request.path}?{query}")
    return build_canonical_uri(request, request.path)


def get_site_base_url(request, *, canonical: bool = False) -> str:
    absolute = build_absolute_uri(request, "/", canonical=canonical)
    parsed = urlsplit(absolute)
    return f"{parsed.scheme}://{parsed.netloc}"


def _normalize_ip(value: str | None) -> str:
    candidate = str(value or "").strip()
    if not candidate:
        return ""
    try:
        return str(ipaddress.ip_address(candidate))
    except ValueError:
        return ""


def organization_schema(request) -> dict:
    logo_url = build_canonical_uri(
        request, static("base/assets/img/ПОВНИЙ ЗНАК _О-16.svg")
    )
    return {
        "@context": "https://schema.org",
        "@type": "RealEstateAgent",
        "name": "DOMINIUM Realty",
        "url": build_canonical_uri(request, "/"),
        "logo": logo_url,
        "image": logo_url,
        "telephone": "+380730032121",
        "address": {
            "@type": "PostalAddress",
            "addressCountry": "UA",
            "addressLocality": "Київ",
            "streetAddress": "DOMINIUM Realty",
        },
        "sameAs": [
            "https://t.me/dominium_realty_agency",
            "https://www.facebook.com/DOMINIUM.REALTY.AGENCY",
        ],
    }


def website_schema(request) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "DOMINIUM Realty",
        "url": build_canonical_uri(request, "/"),
        "inLanguage": "uk-UA",
        "potentialAction": {
            "@type": "SearchAction",
            "target": build_canonical_uri(request, "/search/?q={search_term_string}"),
            "query-input": "required name=search_term_string",
        },
    }


def get_client_ip(request) -> str:
    remote_addr = _normalize_ip(request.META.get("REMOTE_ADDR"))
    trust_forwarded = bool(getattr(settings, "TRUST_X_FORWARDED_FOR", False))
    if not trust_forwarded:
        return remote_addr or "unknown"

    trusted_proxies = set()
    for ip in getattr(settings, "TRUSTED_PROXY_IPS", []) or []:
        normalized = _normalize_ip(ip)
        if normalized:
            trusted_proxies.add(normalized)

    if trusted_proxies and remote_addr and remote_addr not in trusted_proxies:
        return remote_addr

    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    for item in forwarded.split(","):
        forwarded_ip = _normalize_ip(item)
        if forwarded_ip:
            return forwarded_ip

    real_ip = _normalize_ip(request.META.get("HTTP_X_REAL_IP"))
    if real_ip:
        return real_ip

    return remote_addr or "unknown"

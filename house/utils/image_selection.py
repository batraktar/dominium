from __future__ import annotations

import re
from typing import Iterable
from urllib.parse import urlparse

_SIZE_SUFFIX_RE = re.compile(r"([_-])\d{2,5}x\d{2,5}$")
_QUALITY_SUFFIX_RE = re.compile(
    r"([_-])(thumb|thumbnail|preview|small|large|orig|original|wm|watermark)$"
)

_WATERMARK_HINTS = ("watermark", "wm", "logo", "sign", "stamp")
_THUMB_HINTS = ("thumb", "thumbnail", "preview", "small", "icon", "avatar", "crop")
_HIGH_QUALITY_HINTS = ("original", "orig", "full", "large", "big", "max")
_PATH_REMOVE_SEGMENTS = {"wm", "watermark", "thumb", "thumbnail", "preview", "small"}


def _clean_url(url: str | None) -> str:
    return (url or "").strip()


def _normalize_filename(filename: str) -> str:
    if "." in filename:
        stem, ext = filename.rsplit(".", 1)
        ext = f".{ext}"
    else:
        stem, ext = filename, ""

    stem = _SIZE_SUFFIX_RE.sub("", stem)
    stem = _QUALITY_SUFFIX_RE.sub("", stem)
    return f"{stem}{ext}"


def image_url_identity_key(url: str) -> str:
    cleaned = _clean_url(url).lower()
    if not cleaned:
        return ""

    parsed = urlparse(cleaned)
    host = parsed.netloc
    path = parsed.path or cleaned
    path = re.sub(r"/{2,}", "/", path).rstrip("/") or path

    segments = [segment for segment in path.split("/") if segment]
    if segments:
        filtered_segments = [
            segment
            for segment in segments
            if segment.lower() not in _PATH_REMOVE_SEGMENTS
        ]
        if filtered_segments:
            path = "/" + "/".join(filtered_segments)

    if "/" in path:
        prefix, filename = path.rsplit("/", 1)
        normalized = _normalize_filename(filename)
        path = f"{prefix}/{normalized}" if prefix else normalized
    else:
        path = _normalize_filename(path)

    return f"{host}{path}"


def image_url_quality_score(url: str) -> int:
    lowered = _clean_url(url).lower()
    score = 0

    if any(hint in lowered for hint in _WATERMARK_HINTS):
        score -= 3
    if any(hint in lowered for hint in _THUMB_HINTS):
        score -= 2
    if any(hint in lowered for hint in _HIGH_QUALITY_HINTS):
        score += 2

    return score


def select_preferred_urls(candidates: Iterable[tuple[str, int]]) -> list[str]:
    best_by_key: dict[str, tuple[int, str]] = {}
    ordered_keys: list[str] = []

    for url, base_priority in candidates:
        cleaned = _clean_url(url)
        if not cleaned:
            continue

        key = image_url_identity_key(cleaned) or cleaned.lower()
        score = base_priority + image_url_quality_score(cleaned)

        current = best_by_key.get(key)
        if current is None:
            best_by_key[key] = (score, cleaned)
            ordered_keys.append(key)
        elif score > current[0]:
            best_by_key[key] = (score, cleaned)

    return [best_by_key[key][1] for key in ordered_keys]


def build_import_image_pairs(
    main_image: str | None,
    gallery: Iterable[str] | None,
) -> list[tuple[str, bool]]:
    candidates: list[tuple[str, int, bool]] = []

    if main_image:
        # Main image keeps the "main" flag, but gallery URLs usually contain better
        # quality originals, so they have a slightly higher source priority.
        candidates.append((main_image, 20, True))

    for image_url in gallery or []:
        candidates.append((image_url, 30, False))

    best_by_key: dict[str, tuple[int, str, bool]] = {}
    ordered_keys: list[str] = []

    for url, base_priority, wants_main in candidates:
        cleaned = _clean_url(url)
        if not cleaned:
            continue

        key = image_url_identity_key(cleaned) or cleaned.lower()
        score = base_priority + image_url_quality_score(cleaned)
        current = best_by_key.get(key)

        if current is None:
            best_by_key[key] = (score, cleaned, wants_main)
            ordered_keys.append(key)
            continue

        current_score, current_url, current_main = current
        merged_main = current_main or wants_main
        if score > current_score:
            best_by_key[key] = (score, cleaned, merged_main)
        else:
            best_by_key[key] = (current_score, current_url, merged_main)

    return [(best_by_key[key][1], best_by_key[key][2]) for key in ordered_keys]

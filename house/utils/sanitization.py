from __future__ import annotations

from collections.abc import Iterable

import nh3
from django.conf import settings


def _setting_iterable(name: str, default: Iterable[str]) -> list[str]:
    configured = getattr(settings, name, None)
    if not configured:
        return list(default)
    return [str(item) for item in configured if str(item).strip()]


def sanitize_rich_text(raw_html: str | None) -> str:
    """Sanitize untrusted HTML using a strict allowlist policy."""
    if not raw_html:
        return ""
    if not isinstance(raw_html, str):
        raw_html = str(raw_html)

    allowed_tags = set(
        _setting_iterable(
            "SANITIZE_ALLOWED_TAGS",
            [
                "p",
                "br",
                "b",
                "strong",
                "i",
                "em",
                "u",
                "ul",
                "ol",
                "li",
                "a",
            ],
        )
    )
    clean_content_tags = set(
        _setting_iterable(
            "SANITIZE_CLEAN_CONTENT_TAGS",
            ["script", "style", "iframe", "object", "embed"],
        )
    )
    allowed_schemes = set(
        _setting_iterable(
            "SANITIZE_ALLOWED_SCHEMES",
            ["http", "https", "mailto", "tel"],
        )
    )
    allowed_attributes = getattr(
        settings,
        "SANITIZE_ALLOWED_ATTRIBUTES",
        {
            "a": {"href", "title", "target"},
        },
    )

    cleaned = nh3.clean(
        raw_html,
        tags=allowed_tags,
        attributes=allowed_attributes,
        clean_content_tags=clean_content_tags,
        url_schemes=allowed_schemes,
        strip_comments=True,
    )

    return cleaned.strip()

from __future__ import annotations

import json

from django import template
from django.utils.safestring import mark_safe

from house.utils.sanitization import sanitize_rich_text

register = template.Library()


@register.filter(name="sanitize_html")
def sanitize_html(value):
    cleaned = sanitize_rich_text(value or "")
    return mark_safe(cleaned)


@register.filter(name="json_ld")
def json_ld(value):
    """
    Render JSON-LD payload safely inside <script type="application/ld+json">.
    Escapes HTML-breaking chars to prevent closing-tag injection.
    """
    if value in (None, ""):
        return mark_safe("")

    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return mark_safe("null")
    else:
        parsed = value

    payload = json.dumps(parsed, ensure_ascii=False, separators=(",", ":"))
    payload = payload.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    payload = payload.replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
    return mark_safe(payload)

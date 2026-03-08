from __future__ import annotations

import json
import logging

from django.conf import settings
from django.core.cache import cache
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from dominium_backend.views.common import get_client_ip

logger = logging.getLogger(__name__)

_MAX_FIELD_LENGTH = 512
_MAX_BODY_LENGTH = 16384


def _truncate(value: object, *, limit: int = _MAX_FIELD_LENGTH) -> str:
    text = str(value or "").strip()
    if len(text) <= limit:
        return text
    return text[: limit - 1] + "…"


def _extract_csp_report(payload: object) -> dict:
    if isinstance(payload, dict):
        report = payload.get("csp-report")
        if isinstance(report, dict):
            return report

        body = payload.get("body")
        if isinstance(body, dict):
            return body

        return payload

    if isinstance(payload, list):
        for item in payload:
            report = _extract_csp_report(item)
            if report:
                return report

    return {}


def _is_rate_limited(request) -> bool:
    limit = max(1, int(getattr(settings, "CSP_REPORT_RATE_LIMIT", 120) or 120))
    window = max(1, int(getattr(settings, "CSP_REPORT_RATE_WINDOW", 60) or 60))
    ip = get_client_ip(request) or "unknown"
    cache_key = f"csp-report-rate:{ip}"

    current = cache.get(cache_key, 0)
    if current >= limit:
        return True

    if current == 0:
        cache.set(cache_key, 1, timeout=window)
    else:
        try:
            cache.incr(cache_key)
        except ValueError:
            cache.set(cache_key, 1, timeout=window)
    return False


@csrf_exempt
@require_POST
def csp_report_view(request):
    if _is_rate_limited(request):
        return HttpResponse(status=204)

    content_length_header = request.META.get("CONTENT_LENGTH", "")
    try:
        content_length = int(content_length_header)
    except (TypeError, ValueError):
        content_length = 0
    if content_length > _MAX_BODY_LENGTH:
        logger.warning(
            "CSP report payload exceeded max size: content_length=%s path=%s",
            content_length,
            request.path,
        )
        return HttpResponse(status=204)

    raw_body = request.body[:_MAX_BODY_LENGTH]
    decoded_body = raw_body.decode("utf-8", errors="replace")

    try:
        payload = json.loads(decoded_body) if decoded_body else {}
    except json.JSONDecodeError:
        logger.warning(
            "CSP report payload is not valid JSON: content_type=%s path=%s",
            request.META.get("CONTENT_TYPE", ""),
            request.path,
        )
        return HttpResponse(status=204)

    report = _extract_csp_report(payload)
    if not isinstance(report, dict):
        report = {}

    logger.warning(
        "CSP violation report: blocked_uri=%s violated_directive=%s effective_directive=%s disposition=%s document_uri=%s user_agent=%s",
        _truncate(report.get("blocked-uri")),
        _truncate(report.get("violated-directive")),
        _truncate(report.get("effective-directive")),
        _truncate(report.get("disposition")),
        _truncate(report.get("document-uri")),
        _truncate(request.META.get("HTTP_USER_AGENT", "")),
    )

    return HttpResponse(status=204)

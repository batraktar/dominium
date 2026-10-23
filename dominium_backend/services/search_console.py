from __future__ import annotations

import json
from datetime import date, timedelta
from urllib.parse import quote

from django.conf import settings
from django.core.cache import cache
from google.auth.transport.requests import AuthorizedSession
from google.oauth2 import service_account


READONLY_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly"
SUPPORTED_PERIODS = {7, 28, 90}
API_ROOT = "https://www.googleapis.com/webmasters/v3/sites"


class SearchConsoleError(RuntimeError):
    """A safe, non-secret-bearing Search Console failure."""


class SearchConsoleNotConfigured(SearchConsoleError):
    pass


class SearchConsoleUnavailable(SearchConsoleError):
    pass


def _credentials():
    raw = settings.GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON
    if not raw or not settings.GOOGLE_SEARCH_CONSOLE_SITE_URL:
        raise SearchConsoleNotConfigured("Search Console is not configured")
    try:
        info = json.loads(raw)
        if not isinstance(info, dict):
            raise ValueError
        return service_account.Credentials.from_service_account_info(
            info, scopes=[READONLY_SCOPE]
        )
    except Exception as exc:
        raise SearchConsoleNotConfigured(
            "Search Console credentials are not configured correctly"
        ) from exc


def _safe_number(value):
    return value if isinstance(value, (int, float)) and not isinstance(value, bool) else 0


def _metrics(row):
    return {
        "clicks": _safe_number(row.get("clicks")),
        "impressions": _safe_number(row.get("impressions")),
        "ctr": _safe_number(row.get("ctr")),
        "position": _safe_number(row.get("position")),
    }


def _request(session, url, payload):
    try:
        response = session.post(
            url,
            json=payload,
            timeout=settings.REQUESTS_TIMEOUT,
        )
        if response.status_code >= 400:
            raise SearchConsoleUnavailable("Search Console request failed")
        data = response.json()
        if not isinstance(data, dict):
            raise ValueError
        return data
    except SearchConsoleUnavailable:
        raise
    except Exception as exc:
        raise SearchConsoleUnavailable("Search Console request failed") from exc


def get_search_performance(period_days: int, *, today: date | None = None) -> dict:
    if period_days not in SUPPORTED_PERIODS:
        raise ValueError("Unsupported Search Console period")

    site_url = settings.GOOGLE_SEARCH_CONSOLE_SITE_URL
    cache_key = f"search-console:v1:{site_url}:{period_days}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    credentials = _credentials()
    session = AuthorizedSession(credentials)
    end_date = today or date.today()
    start_date = end_date - timedelta(days=period_days - 1)
    base_payload = {
        "startDate": start_date.isoformat(),
        "endDate": end_date.isoformat(),
        "dataState": "all",
    }
    endpoint = f"{API_ROOT}/{quote(site_url, safe='')}/searchAnalytics/query"

    aggregate = _request(session, endpoint, base_payload)
    daily = _request(session, endpoint, {**base_payload, "dimensions": ["date"], "rowLimit": period_days})
    queries = _request(session, endpoint, {**base_payload, "dimensions": ["query"], "rowLimit": 25})
    pages = _request(session, endpoint, {**base_payload, "dimensions": ["page"], "rowLimit": 25})

    aggregate_row = (aggregate.get("rows") or [{}])[0]
    result = {
        "status": "ok",
        "period_days": period_days,
        "site_url": site_url,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "metrics": _metrics(aggregate_row),
        "daily": [
            {"date": (row.get("keys") or [""])[0], **_metrics(row)}
            for row in daily.get("rows", [])
        ],
        "top_queries": [
            {"query": (row.get("keys") or [""])[0], **_metrics(row)}
            for row in queries.get("rows", [])
        ],
        "top_pages": [
            {"page": (row.get("keys") or [""])[0], **_metrics(row)}
            for row in pages.get("rows", [])
        ],
        "incomplete_from": (aggregate.get("metadata") or {}).get(
            "first_incomplete_date"
        ),
    }
    cache.set(cache_key, result, settings.GOOGLE_SEARCH_CONSOLE_CACHE_SECONDS)
    return result

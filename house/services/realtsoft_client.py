from __future__ import annotations

import hashlib
import hmac
import logging
from base64 import b64encode
from typing import Any
from urllib.parse import urlencode, urlsplit

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

ALLOWED_HTTP_METHODS = frozenset({"GET", "POST", "PUT", "DELETE"})


class RealtsoftAPIError(Exception):
    def __init__(self, message: str, status_code: int | None = None, response: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.response = response


class RealtsoftClient:
    def __init__(
        self,
        url: str,
        key: str,
        secret: str,
        timeout: int = 15,
        verify_ssl: bool = True,
    ):
        self.url = url.rstrip("/")
        self.key = key
        self.secret = secret
        self.timeout = timeout
        self.verify_ssl = verify_ssl

    def call(self, method: str, params: dict | None = None, http_method: str = "GET") -> dict:
        http_method = http_method.upper()
        if http_method not in ALLOWED_HTTP_METHODS:
            http_method = "GET"

        params = dict(params or {})
        sign = self._generate_sign(method, params)

        headers = {
            "auth": f"{self.key}:{sign}",
        }

        api_url = f"{self.url}/api/{method}"

        try:
            request_kwargs = {
                "params": params,
            } if http_method == "GET" else {
                "data": params,
            }
            response = requests.request(
                http_method,
                api_url,
                headers=headers,
                timeout=self.timeout,
                verify=self.verify_ssl,
                **request_kwargs,
            )
            response.raise_for_status()
        except requests.HTTPError as exc:
            status_code = exc.response.status_code if exc.response is not None else None
            logger.error(
                "Realtsoft API rejected request: %s %s (HTTP %s)",
                http_method,
                method,
                status_code,
            )
            raise RealtsoftAPIError(
                f"CRM відхилив запит (HTTP {status_code or 'unknown'})",
                status_code=status_code,
                response=exc.response,
            ) from exc
        except requests.RequestException as exc:
            logger.error("Realtsoft API request failed: %s %s — %s", http_method, method, exc)
            raise RealtsoftAPIError(f"Помилка з'єднання з CRM: {exc}") from exc

        try:
            data = response.json()
        except ValueError:
            logger.error(
                "Realtsoft API returned non-JSON (status %s): %s",
                response.status_code,
                response.text[:500],
            )
            raise RealtsoftAPIError(
                f"CRM повернув некоректну відповідь (HTTP {response.status_code})",
                status_code=response.status_code,
                response=response.text,
            )

        return data

    def _generate_sign(self, method: str, params: dict) -> str:
        sorted_params = dict(sorted(params.items()))
        query_string = urlencode(sorted_params, doseq=True)
        md5_hash = hashlib.md5(query_string.encode("utf-8")).hexdigest()
        message = f"{method}{md5_hash}"
        signature = hmac.new(
            self.secret.encode("utf-8"),
            message.encode("utf-8"),
            hashlib.sha1,
        ).hexdigest()
        return b64encode(signature.encode("utf-8")).decode("utf-8")

    def search_estate(self, page: int = 1, per_page: int = 150, **filters) -> dict:
        params = {
            "status": "active",
            "per-page": str(per_page),
            "page": str(page),
            "expand": "images",
        }

        field_map = {
            "realty_type": "realty_type",
            "deal": "deal",
            "category": "category",
            "city_id": "city_id",
            "district_id": "district_id",
            "price_from": "price[from]",
            "price_till": "price[till]",
            "area_from": "area_total[from]",
            "area_till": "area_total[till]",
            "rooms_from": "room_count[from]",
            "rooms_till": "room_count[till]",
            "price_currency_id": "price_currency_id",
        }

        for filter_key, param_key in field_map.items():
            value = filters.get(filter_key)
            if value is not None and str(value).strip():
                params[param_key] = str(value).strip()

        return self.call("estate/index", params, http_method="GET")

    def find_client(self, phone: str | None = None, email: str | None = None) -> list[dict]:
        params = {}
        if phone:
            params["phone"] = phone
        if email:
            params["email"] = email
        return self.call("client/index", params, http_method="GET") or []

    def create_client(
        self,
        phones: list[str],
        name: str,
        email: str = "",
        responsible_user_id: int = 1,
    ) -> dict:
        return self.call(
            "client/create",
            {
                "phones": phones,
                "name": name,
                "email": email,
                "responsible_user_id": str(responsible_user_id),
            },
            http_method="POST",
        )

    def create_inquiry(
        self,
        client_id: int,
        deal: int,
        realty_type: int,
        category: int,
        name: str,
        source_kind: str = "",
        responsible_user_id: int = 1,
        **extra,
    ) -> dict:
        params = {
            "responsible_user_id": str(responsible_user_id),
            "deal": str(deal),
            "realty_type": str(realty_type),
            "category": str(category),
            "name": name,
            "price_kind": "per_object",
            "client_id": str(client_id),
            "source_kind": source_kind,
        }
        params.update({k: str(v) for k, v in extra.items()})
        return self.call("inquiry/create", params, http_method="POST")


def get_realtsoft_client() -> RealtsoftClient:
    from house.models import AppSettings

    saved = AppSettings.get("crm", {})
    if not isinstance(saved, dict):
        saved = {}

    url = str(saved.get("url") or getattr(settings, "REALTSOFT_CRM_URL", "")).strip()
    key = str(saved.get("api_key") or getattr(settings, "REALTSOFT_API_KEY", "")).strip()
    secret = str(
        saved.get("secret_key") or getattr(settings, "REALTSOFT_SECRET_KEY", "")
    ).strip()

    if not all([url, key, secret]):
        raise RealtsoftAPIError(
            "Realtsoft CRM налаштування відсутні. "
            "Перевірте REALTSOFT_CRM_URL, REALTSOFT_API_KEY, REALTSOFT_SECRET_KEY."
        )

    parsed_url = urlsplit(url)
    if parsed_url.scheme != "https" or not parsed_url.netloc:
        raise RealtsoftAPIError(
            "REALTSOFT_CRM_URL має бути повною HTTPS-адресою, "
            "наприклад https://your-project.realtsoft.net."
        )

    return RealtsoftClient(
        url=url,
        key=key,
        secret=secret,
        timeout=getattr(settings, "REALTSOFT_TIMEOUT", 15),
        verify_ssl=getattr(settings, "REALTSOFT_VERIFY_SSL", True),
    )


def is_realtsoft_sync_enabled() -> bool:
    from house.models import AppSettings

    saved = AppSettings.get("crm", {})
    if isinstance(saved, dict) and "enabled" in saved:
        return bool(saved["enabled"])
    return bool(getattr(settings, "REALTSOFT_SYNC_ENABLED", False))

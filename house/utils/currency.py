from __future__ import annotations

import logging
from typing import Dict

import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

EXCHANGE_CACHE_KEY = "house:exchange_rates"
EXCHANGE_CACHE_TIMEOUT = getattr(settings, "EXCHANGE_RATES_CACHE_SECONDS", 60 * 30)
DEFAULT_RATES = {"USD": 40.0, "EUR": 43.5, "UAH": 1.0}


def _fetch_privtabank_rates() -> Dict[str, float] | None:
    endpoint = getattr(
        settings,
        "EXCHANGE_RATES_URL",
        "https://api.privatbank.ua/p24api/pubinfo?exchange&json&coursid=11",
    )
    timeout = getattr(settings, "REQUESTS_TIMEOUT", 10)

    try:
        response = requests.get(endpoint, timeout=timeout)
        response.raise_for_status()
    except requests.RequestException as exc:
        logger.warning("Не вдалося отримати курси валют: %s", exc, exc_info=False)
        return None

    try:
        data = response.json()
    except ValueError:
        logger.warning("Невалідна відповідь від сервісу курсів валют.")
        return None

    rates: Dict[str, float] = {"UAH": 1.0}
    for item in data:
        code = item.get("ccy")
        sale = item.get("sale")
        if code in {"USD", "EUR"}:
            try:
                rates[code] = float(sale)
            except (TypeError, ValueError):
                logger.warning("Невалідне значення курсу %s: %s", code, sale)
    return rates if len(rates) > 1 else None


def get_exchange_rates(force_refresh: bool = False) -> Dict[str, float]:
    """
    Повертає словник курсів валют з кешем та дефолтними значеннями.

    Якщо сервіс недоступний — повертаються останні кешовані або дефолтні курси.
    """
    if not force_refresh:
        cached = cache.get(EXCHANGE_CACHE_KEY)
        if cached:
            return cached

    rates = _fetch_privtabank_rates()
    if rates:
        cache.set(EXCHANGE_CACHE_KEY, rates, timeout=EXCHANGE_CACHE_TIMEOUT)
        return rates

    fallback = cache.get(EXCHANGE_CACHE_KEY)
    if fallback:
        return fallback

    return DEFAULT_RATES.copy()

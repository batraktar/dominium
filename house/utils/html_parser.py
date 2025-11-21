from __future__ import annotations

import logging
import re
from dataclasses import asdict, dataclass
from decimal import Decimal, InvalidOperation
from functools import lru_cache
from math import ceil
from pathlib import Path
from typing import Iterable, List, Optional, Tuple

from bs4 import BeautifulSoup, Tag

from house.utils.currency import get_exchange_rates

logger = logging.getLogger(__name__)

RENT_KEYWORDS = [
    "оренда",
    "орендую",
    "орендувати",
    "орендується",
    "здається",
    "здаю",
    "здають",
    "здам",
    "здача",
    "зняти",
    "зніму",
]
SALE_KEYWORDS = [
    "продаж",
    "продам",
    "продається",
    "продаю",
    "продають",
    "купити",
    "куплю",
]

CURRENCY_SIGNS = {
    "грн": "UAH",
    "₴": "UAH",
    "€": "EUR",
    "$": "USD",
}

ADDRESS_SELECTORS: Tuple[str, ...] = (
    "[data-address]",
    "[itemprop='streetAddress']",
    "[itemprop='address']",
    ".pdf-address",
    ".estate-address",
    ".object__address",
    ".property-address",
    ".address",
    ".contact-address",
    ".hero-address",
    "meta[property='og:street-address']",
    "meta[name='geo.placename']",
    "meta[name='address']",
    "h3",
)

LATITUDE_ATTRS = (
    "data-lat",
    "data-latitude",
    "data-latitude-dec",
    "data-latitude-decimal",
)
LONGITUDE_ATTRS = (
    "data-lon",
    "data-lng",
    "data-longitude",
    "data-lng-dec",
    "data-longitude-decimal",
)
LATITUDE_META = (
    "meta[name='geo.position']",
    "meta[property='place:location:latitude']",
)
LONGITUDE_META = (
    "meta[name='geo.position']",
    "meta[property='place:location:longitude']",
)


@dataclass
class ParsedProperty:
    title: str
    address: str
    price: float
    area: float
    rooms: int
    description_html: str
    main_image: str
    gallery: List[str]
    property_type: str
    deal_type: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    def as_dict(self) -> dict:
        return asdict(self)


def detect_currency(price_text: str) -> str:
    lcase = price_text.lower()
    for sign, code in CURRENCY_SIGNS.items():
        if sign in lcase:
            return code
    return "USD"


def clean_price(price_text: str) -> str:
    cleaned = price_text.lower()
    for sign in CURRENCY_SIGNS:
        cleaned = cleaned.replace(sign, "")
    cleaned = re.sub(r"[^\d.,-]", "", cleaned)
    return cleaned.replace(" ", "")


def round_up_to_nearest_five(value: float) -> float:
    if value <= 0:
        return value
    return ceil(value / 5) * 5


def convert_to_usd(price: Decimal, currency: str, rates: dict) -> float:
    usd_rate = _safe_float(rates.get("USD"), default=1.0)

    if currency == "UAH":
        converted = float(price) / usd_rate if usd_rate else float(price)
        return round_up_to_nearest_five(converted)

    if currency == "EUR":
        eur_rate = _safe_float(rates.get("EUR"), default=usd_rate or 1.0)
        eur_to_usd = eur_rate / usd_rate if usd_rate else 1.0
        converted = float(price) * eur_to_usd
        return round_up_to_nearest_five(converted)

    return float(price)


def get_deal_type(title: str) -> str:
    title_lower = title.lower()
    if any(word in title_lower for word in RENT_KEYWORDS):
        return "Оренда"
    if any(word in title_lower for word in SALE_KEYWORDS):
        return "Продаж"
    return "Інше"


def get_property_type(title: str) -> str:
    title_lower = title.lower()
    if any(w in title_lower for w in ["будинок", "котедж", "дуплекс"]):
        return "Будинок"
    if any(w in title_lower for w in ["квартир", "апартамент", "апартаменти"]):
        return "Квартира"
    if any(w in title_lower for w in ["земельн", "ділянка", "соток"]):
        return "Земельна ділянка"
    if any(w in title_lower for w in ["комерц", "офіс", "магазин"]):
        return "Комерційна нерухомість"
    return "Інше"


def parse_property_from_html(
    html_path: str | Path,
    *,
    rates: Optional[dict] = None,
    geocode_missing: bool = False,
    geocoder_user_agent: str = "dominium-parser",
) -> dict:
    path = Path(html_path)
    html = path.read_text(encoding="utf-8")
    parsed = parse_property_html(
        html,
        source=str(path),
        rates=rates,
        geocode_missing=geocode_missing,
        geocoder_user_agent=geocoder_user_agent,
    )
    return parsed.as_dict()


def parse_property_html(
    html: str,
    *,
    source: Optional[str] = None,
    rates: Optional[dict] = None,
    geocode_missing: bool = False,
    geocoder_user_agent: str = "dominium-parser",
) -> ParsedProperty:
    soup = BeautifulSoup(html, "html.parser")
    location = f" ({source})" if source else ""

    title = _extract_title(soup)
    if not title:
        logger.warning("Не вдалося визначити заголовок%s", location)

    address = _extract_address(soup)
    if not address:
        logger.warning("Не вдалося визначити адресу%s", location)

    price_usd = _extract_price_usd(soup, rates)
    rooms = _extract_rooms(soup)
    area = _extract_area(soup)
    description_html = _extract_description(soup)
    main_image, gallery = _extract_images(soup)
    property_type = get_property_type(title)
    deal_type = get_deal_type(title)
    latitude, longitude = _extract_coordinates(soup)

    if geocode_missing and address and (latitude is None or longitude is None):
        g_lat, g_lon = geocode_address(address, user_agent=geocoder_user_agent)
        latitude = latitude or g_lat
        longitude = longitude or g_lon

    return ParsedProperty(
        title=title,
        address=address,
        price=price_usd,
        area=area,
        rooms=rooms,
        description_html=description_html,
        main_image=main_image,
        gallery=gallery,
        property_type=property_type,
        deal_type=deal_type,
        latitude=latitude,
        longitude=longitude,
    )


def _extract_title(soup: BeautifulSoup) -> str:
    title_tag = (
        soup.select_one("h1") or soup.select_one("h2") or soup.select_one("title")
    )
    if title_tag:
        if isinstance(title_tag, Tag) and title_tag.name == "meta":
            return _normalize_text(title_tag.get("content", ""))
        return _normalize_text(title_tag.get_text())
    meta_title = soup.select_one("meta[property='og:title']")
    if meta_title:
        return _normalize_text(meta_title.get("content", ""))
    return "Об'єкт DOMINIUM"


def _extract_address(soup: BeautifulSoup) -> str:
    for selector in ADDRESS_SELECTORS:
        candidate = soup.select_one(selector)
        if not candidate:
            continue
        if isinstance(candidate, Tag) and candidate.name == "meta":
            text = candidate.get("content") or candidate.get("value")
        elif isinstance(candidate, Tag):
            text = candidate.get_text(" ", strip=True)
        else:
            text = str(candidate).strip()
        if text:
            return _normalize_text(text)

    data_attr_holder = soup.find(
        attrs={attr: True for attr in ["data-address", "data-location"]}
    )
    if data_attr_holder:
        for attr in ["data-address", "data-location"]:
            text = data_attr_holder.get(attr)
            if text:
                return _normalize_text(text)

    text_candidates: List[str] = []
    for node in soup.find_all(["p", "span", "li"]):
        text = node.get_text(" ", strip=True)
        if not text:
            continue
        lower = text.lower()
        if "вул" in lower or "м." in lower or "район" in lower:
            text_candidates.append(_normalize_text(text))
    if text_candidates:
        return text_candidates[0]

    return ""


def _extract_price_usd(soup: BeautifulSoup, rates: Optional[dict]) -> float:
    price_node = soup.select_one(".pdf-header-contacts strong") or soup.select_one(
        "[data-price]"
    )
    price_raw = ""
    if price_node:
        price_raw = (
            price_node.get_text(" ", strip=True)
            if isinstance(price_node, Tag)
            else str(price_node)
        )
    else:
        meta_price = soup.select_one("meta[itemprop='price']") or soup.select_one(
            "meta[property='product:price:amount']"
        )
        if meta_price:
            price_raw = meta_price.get("content", "")

    if not price_raw:
        logger.warning("Не знайдено ціну у вихідному документі.")
        return 0.0

    currency = detect_currency(price_raw)
    price_clean = clean_price(price_raw)

    try:
        price_decimal = Decimal(price_clean.replace(",", "."))
    except InvalidOperation:
        logger.error("❌ Неможливо розпарсити ціну '%s'", price_raw)
        return 0.0

    rates = rates or get_exchange_rates()
    return convert_to_usd(price_decimal, currency, rates)


def _extract_rooms(soup: BeautifulSoup) -> int:
    icon = soup.select_one("img[src*='_room-icon']")
    if icon:
        parent = icon.find_parent("span")
        if parent:
            value = _extract_int(parent.get_text())
            if value:
                return value

    table_cell = soup.find("th", string=lambda s: s and "Кіл. кімнат" in s)
    if table_cell:
        td = table_cell.find_next_sibling("td")
        value = _extract_int(td.get_text() if td else "")
        if value:
            return value

    text_candidate = soup.find(
        string=re.compile(r"\d+\s*(кімнат|кімн|кімн\.)", re.IGNORECASE)
    )
    if text_candidate:
        value = _extract_int(str(text_candidate))
        if value:
            return value

    logger.warning("❌ Не вдалося визначити кількість кімнат, ставимо 1")
    return 1


def _extract_area(soup: BeautifulSoup) -> float:
    icon = soup.select_one("img[src*='_area-icon']")
    if icon:
        parent = icon.find_parent("span")
        if parent:
            value = _extract_float(parent.get_text())
            if value is not None:
                return value

    cell = soup.find("th", string=lambda s: s and "Площа" in s)
    if cell:
        td = cell.find_next_sibling("td")
        value = _extract_float(td.get_text() if td else "")
        if value is not None:
            return value

    text_candidate = soup.find(
        string=re.compile(r"\d+[.,]?\d*\s*(м2|м²)", re.IGNORECASE)
    )
    value = _extract_float(str(text_candidate)) if text_candidate else None
    return value if value is not None else 0.0


def _extract_description(soup: BeautifulSoup) -> str:
    pdf_blocks = soup.find_all("div", class_="pdf-block")
    if len(pdf_blocks) > 1:
        return str(pdf_blocks[1])

    description = soup.select_one("[itemprop='description']") or soup.select_one(
        ".description"
    )
    if description:
        return str(description)

    paragraphs = soup.select(".pdf-description p")
    if paragraphs:
        return "".join(str(p) for p in paragraphs)

    return ""


def _extract_images(soup: BeautifulSoup) -> Tuple[str, List[str]]:
    main_image_tag = soup.select_one(".pdf-img img") or soup.select_one(
        "img.main-image"
    )
    main_image = (
        main_image_tag["src"]
        if isinstance(main_image_tag, Tag) and main_image_tag.has_attr("src")
        else ""
    )

    gallery_urls: List[str] = []
    for link in soup.select("#estate-images a, .gallery a"):
        if isinstance(link, Tag):
            href = link.get("href")
            if href:
                gallery_urls.append(href)

    for image in soup.select("#estate-images img, .gallery img"):
        if isinstance(image, Tag):
            src = image.get("src")
            if src:
                gallery_urls.append(src)

    gallery: List[str] = []
    for url in gallery_urls:
        if url and url not in gallery:
            gallery.append(url)

    if not main_image and gallery:
        main_image = gallery[0]

    return main_image, gallery


def _extract_coordinates(
    soup: BeautifulSoup,
) -> Tuple[Optional[float], Optional[float]]:
    for element in soup.find_all(True):
        lat = _first_float_attr(element, LATITUDE_ATTRS)
        lon = _first_float_attr(element, LONGITUDE_ATTRS)
        if lat is not None and lon is not None:
            return lat, lon

    for selector in LATITUDE_META:
        tag = soup.select_one(selector)
        if tag and isinstance(tag, Tag):
            content = tag.get("content") or tag.get("value")
            lat, lon = _parse_geo_position(content)
            if lat is not None and lon is not None:
                return lat, lon

    for selector in LONGITUDE_META:
        tag = soup.select_one(selector)
        if tag and isinstance(tag, Tag):
            content = tag.get("content") or tag.get("value")
            lat, lon = _parse_geo_position(content)
            if lat is not None and lon is not None:
                return lat, lon

    script_tag = soup.find(string=re.compile(r"latitude", re.IGNORECASE))
    if script_tag:
        lat = _extract_float(
            script_tag, default=None, pattern=r"latitude\s*[:=]\s*([0-9.\-]+)"
        )
        lon = _extract_float(
            script_tag, default=None, pattern=r"longitude\s*[:=]\s*([0-9.\-]+)"
        )
        if lat is not None and lon is not None:
            return lat, lon

    return None, None


def geocode_address(
    address: str, *, user_agent: str = "dominium-parser"
) -> Tuple[Optional[float], Optional[float]]:
    if not address:
        return None, None
    return _geocode_cached(address, user_agent)


@lru_cache(maxsize=256)
def _geocode_cached(
    address: str, user_agent: str
) -> Tuple[Optional[float], Optional[float]]:
    try:
        geolocator = _get_geolocator(user_agent)
    except Exception as exc:  # geopy might be missing or misconfigured
        logger.warning("Geocoder недоступний: %s", exc)
        return None, None

    variants = _address_variants(address)
    for candidate in variants:
        try:
            location = geolocator.geocode(candidate)
        except Exception as exc:
            logger.warning("Не вдалося геокодувати адресу '%s': %s", candidate, exc)
            continue
        if location:
            return location.latitude, location.longitude

    logger.info("Геокодер не знайшов координати для '%s'", address)
    return None, None


_GEOCODERS: dict[str, object] = {}


def _get_geolocator(user_agent: str):
    geolocator = _GEOCODERS.get(user_agent)
    if geolocator:
        return geolocator
    try:
        from geopy.geocoders import Nominatim  # type: ignore
    except ImportError as exc:
        raise RuntimeError("geopy не встановлено, геокодування неможливе.") from exc
    geolocator = Nominatim(user_agent=user_agent, timeout=10)
    _GEOCODERS[user_agent] = geolocator
    return geolocator


def _first_float_attr(element: Tag, attrs: Iterable[str]) -> Optional[float]:
    for attr in attrs:
        if element.has_attr(attr):
            value = _safe_float(element.get(attr))
            if value is not None:
                return value
    return None


def _parse_geo_position(
    value: Optional[str],
) -> Tuple[Optional[float], Optional[float]]:
    if not value:
        return None, None
    parts = re.split(r"[;,]", value)
    if len(parts) >= 2:
        return _safe_float(parts[0]), _safe_float(parts[1])
    return None, None


def _extract_int(text: str) -> Optional[int]:
    if not text:
        return None
    match = re.search(r"\d+", text.replace(" ", ""))
    return int(match.group()) if match else None


def _extract_float(
    text: str,
    default: Optional[float] = None,
    pattern: str = r"([0-9]+(?:[.,][0-9]+)?)",
) -> Optional[float]:
    if not text:
        return default
    match = re.search(pattern, text.replace(" ", ""))
    if not match:
        return default
    return _safe_float(match.group(), default=default)


def _safe_float(
    value: Optional[object], default: Optional[float] = None
) -> Optional[float]:
    if value in (None, ""):
        return default
    try:
        return float(str(value).replace(",", "."))
    except (TypeError, ValueError):
        return default


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _address_variants(address: str) -> List[str]:
    variants: List[str] = []
    parts = [part.strip() for part in address.split(",") if part.strip()]

    def add(candidate: str):
        candidate = candidate.strip(", ")
        if not candidate:
            return
        if candidate not in variants:
            variants.append(candidate)
        if "україн" not in candidate.lower():
            with_country = f"{candidate}, Україна"
            if with_country not in variants:
                variants.append(with_country)

    add(", ".join(parts) if parts else address)

    no_district = [part for part in parts if "район" not in part.lower()]
    if no_district and no_district != parts:
        add(", ".join(no_district))

    for idx, part in enumerate(parts):
        if "район" in part.lower() and idx + 1 < len(parts):
            add(", ".join(parts[idx + 1 :]))

    return variants or [address]

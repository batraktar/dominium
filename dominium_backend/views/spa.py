from __future__ import annotations

import json
import logging
from functools import lru_cache
from pathlib import Path

from django.conf import settings
from django.http import Http404, HttpResponseNotFound
from django.shortcuts import render
from django.templatetags.static import static
from django.urls import reverse
from django.utils.html import strip_tags

from house.models import Property
from dominium_backend.seo_regions import (
    DEFAULT_INDEX_ROBOTS,
    get_city_config,
    get_region_config,
)

from .common import (
    build_absolute_uri,
    build_canonical_uri,
    canonical_query_string,
    build_canonical_request_url,
    get_client_ip,
    organization_schema,
    website_schema,
)

logger = logging.getLogger(__name__)

DEFAULT_META_DESCRIPTION = (
    "DOMINIUM — агенція нерухомості, що допомагає купити або орендувати "
    "перевірені обʼєкти в Україні."
)
DEFAULT_REACT_ENTRY = "index.html"
SEARCH_CANONICAL_IGNORED_PARAMS = {"page", "per_page", "sort", "currency"}


def _normalize_asset_path(path: str) -> str:
    return str(path or "").lstrip("/")


@lru_cache(maxsize=1)
def _load_manifest_cached(manifest_path: str) -> dict:
    path = Path(manifest_path)
    payload = path.read_text(encoding="utf-8")
    return json.loads(payload)


def _load_manifest(manifest_path: Path) -> dict:
    if settings.DEBUG:
        payload = manifest_path.read_text(encoding="utf-8")
        return json.loads(payload)
    return _load_manifest_cached(str(manifest_path))


def _collect_css(manifest: dict, entry_key: str) -> list[str]:
    css_files: list[str] = []
    seen: set[str] = set()
    stack = [entry_key]

    while stack:
        current = stack.pop()
        if current in seen:
            continue
        seen.add(current)

        chunk = manifest.get(current) or {}
        for css_path in chunk.get("css", []):
            normalized = _normalize_asset_path(css_path)
            if normalized and normalized not in css_files:
                css_files.append(normalized)

        for imported_key in chunk.get("imports", []):
            if imported_key not in seen:
                stack.append(imported_key)

    return css_files


def _collect_imports(manifest: dict, entry_key: str) -> list[str]:
    import_files: list[str] = []
    seen: set[str] = set()
    stack = list((manifest.get(entry_key) or {}).get("imports", []))

    while stack:
        current = stack.pop()
        if current in seen:
            continue
        seen.add(current)

        chunk = manifest.get(current) or {}
        file_path = _normalize_asset_path(chunk.get("file", ""))
        if file_path and file_path not in import_files:
            import_files.append(file_path)

        for imported_key in chunk.get("imports", []):
            if imported_key not in seen:
                stack.append(imported_key)

    return import_files


def _parse_int(value, fallback: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


def _build_search_canonical_url(request) -> str:
    return build_canonical_request_url(
        request,
        ignored_query_params=SEARCH_CANONICAL_IGNORED_PARAMS,
        drop_tracking_params=True,
    )


def _search_should_noindex(request) -> bool:
    page_number = _parse_int(request.GET.get("page"), 1)
    if page_number > 1:
        return True

    return bool(
        canonical_query_string(
            request,
            ignored_query_params=SEARCH_CANONICAL_IGNORED_PARAMS,
            drop_tracking_params=True,
        )
    )


def _build_search_scope_meta(scope: dict | None) -> tuple[str, str]:
    default_title = "Пошук нерухомості - DOMINIUM"
    default_description = (
        "Підбір нерухомості DOMINIUM: квартири, будинки та комерційні обʼєкти "
        "з фільтрами за ціною, площею і кількістю кімнат."
    )
    if not scope:
        return default_title, default_description

    base_title = str(scope.get("title") or "").strip()
    base_description = str(scope.get("description") or "").strip()

    meta_title = f"{base_title} — DOMINIUM" if base_title else default_title
    if not base_description:
        return meta_title, default_description

    meta_description = (
        f"{base_description} DOMINIUM: фільтрація за ціною, площею, кімнатами та типом угоди."
    )
    return meta_title, meta_description[:160]


def _build_breadcrumb_schema(items: list[dict]) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": index,
                "name": item["name"],
                "item": item["url"],
            }
            for index, item in enumerate(items, start=1)
        ],
    }


def _resolve_property_og_image(request, property_obj) -> tuple[str, str]:
    default_image = build_absolute_uri(
        request, static("base/assets/img/ПОВНИЙ ЗНАК _О-16.svg"), canonical=True
    )
    default_alt = property_obj.title or "DOMINIUM"

    images = list(property_obj.images.all())
    main_image = next(
        (image for image in images if getattr(image, "is_main", False)),
        images[0] if images else None,
    )
    if not main_image or not getattr(main_image, "image", None):
        return default_image, default_alt

    return build_absolute_uri(request, main_image.image.url, canonical=True), default_alt


def _build_search_structured_payload(
    request,
    *,
    canonical_url: str,
    meta_title: str,
    meta_description: str,
    scope_name: str = "",
) -> list[dict]:
    breadcrumb_items = [
        {"name": "Головна", "url": build_canonical_uri(request, reverse("start_page"))},
        {"name": "Пошук", "url": build_canonical_uri(request, reverse("property_search"))},
    ]
    if scope_name:
        breadcrumb_items.append({"name": scope_name, "url": canonical_url})

    return [
        organization_schema(request),
        website_schema(request),
        {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": meta_title,
            "url": canonical_url,
            "description": meta_description,
            "inLanguage": "uk-UA",
        },
        _build_breadcrumb_schema(breadcrumb_items),
    ]


def _build_property_structured_payload(
    request,
    *,
    property_obj,
    canonical_url: str,
    og_image: str,
) -> list[dict]:
    description_text = (
        strip_tags(property_obj.description or "").strip()
        or f"{property_obj.title} — {property_obj.address}".strip(" —")
    )
    breadcrumb_items = [
        {"name": "Головна", "url": build_canonical_uri(request, reverse("start_page"))},
        {"name": "Пошук", "url": build_canonical_uri(request, reverse("property_search"))},
        {"name": property_obj.title, "url": canonical_url},
    ]

    listing_payload = {
        "@context": "https://schema.org",
        "@type": "RealEstateListing",
        "name": property_obj.title,
        "url": canonical_url,
        "description": description_text[:500],
        "image": og_image,
        "datePosted": property_obj.created_at.isoformat() if property_obj.created_at else "",
        "numberOfRooms": property_obj.rooms,
        "floorSize": {
            "@type": "QuantitativeValue",
            "value": property_obj.area,
            "unitCode": "MTK",
        },
        "address": {
            "@type": "PostalAddress",
            "streetAddress": property_obj.address,
            "addressCountry": "UA",
        },
        "offers": {
            "@type": "Offer",
            "price": float(property_obj.price),
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock",
            "url": canonical_url,
        },
    }

    if property_obj.property_type and property_obj.property_type.name:
        listing_payload["category"] = property_obj.property_type.name
    if property_obj.deal_type and property_obj.deal_type.name:
        listing_payload["additionalProperty"] = [
            {
                "@type": "PropertyValue",
                "name": "deal_type",
                "value": property_obj.deal_type.name,
            }
        ]
    if property_obj.latitude is not None and property_obj.longitude is not None:
        listing_payload["geo"] = {
            "@type": "GeoCoordinates",
            "latitude": property_obj.latitude,
            "longitude": property_obj.longitude,
        }

    return [
        organization_schema(request),
        website_schema(request),
        listing_payload,
        _build_breadcrumb_schema(breadcrumb_items),
    ]


def resolve_react_assets() -> dict:
    dev_server_url = (
        str(getattr(settings, "REACT_SPA_DEV_SERVER_URL", "") or "").strip().rstrip("/")
    )
    entry_key = str(getattr(settings, "REACT_SPA_ENTRY", DEFAULT_REACT_ENTRY) or DEFAULT_REACT_ENTRY)

    if settings.DEBUG and dev_server_url:
        dev_entry = entry_key
        if dev_entry == "index.html":
            dev_entry = "src/main.jsx"
        return {
            "mode": "dev",
            "entry": dev_entry,
            "dev_server": dev_server_url,
            "js": "",
            "css": [],
            "imports": [],
        }

    manifest_raw_path = str(getattr(settings, "REACT_SPA_MANIFEST_PATH", "") or "").strip()
    manifest_path = Path(manifest_raw_path)
    if manifest_raw_path and not manifest_path.is_absolute():
        manifest_path = Path(getattr(settings, "BASE_DIR", Path.cwd())) / manifest_path

    if not manifest_raw_path or not manifest_path.exists():
        logger.error("React manifest not found: %s", manifest_path)
        return {
            "mode": "missing",
            "entry": entry_key,
            "dev_server": "",
            "js": "",
            "css": [],
            "imports": [],
            "error": "manifest_not_found",
        }

    try:
        manifest = _load_manifest(manifest_path)
    except (OSError, json.JSONDecodeError):
        logger.exception("Failed to read React manifest: %s", manifest_path)
        return {
            "mode": "missing",
            "entry": entry_key,
            "dev_server": "",
            "js": "",
            "css": [],
            "imports": [],
            "error": "manifest_invalid",
        }

    entry = manifest.get(entry_key)
    if not entry:
        logger.error("React entry '%s' not found in manifest: %s", entry_key, manifest_path)
        return {
            "mode": "missing",
            "entry": entry_key,
            "dev_server": "",
            "js": "",
            "css": [],
            "imports": [],
            "error": "entry_missing",
        }

    entry_file = _normalize_asset_path(entry.get("file", ""))
    if not entry_file:
        logger.error("React entry file missing in manifest for '%s': %s", entry_key, manifest_path)
        return {
            "mode": "missing",
            "entry": entry_key,
            "dev_server": "",
            "js": "",
            "css": [],
            "imports": [],
            "error": "entry_file_missing",
        }

    return {
        "mode": "prod",
        "entry": entry_key,
        "dev_server": "",
        "js": entry_file,
        "css": _collect_css(manifest, entry_key),
        "imports": _collect_imports(manifest, entry_key),
    }


def _build_meta_context(
    request,
    *,
    meta_title: str,
    meta_description: str = DEFAULT_META_DESCRIPTION,
    canonical_url: str | None = None,
    meta_robots: str = DEFAULT_INDEX_ROBOTS,
    og_type: str = "website",
    og_title: str | None = None,
    og_image: str | None = None,
    og_image_alt: str | None = None,
    meta_published_time: str | None = None,
    meta_modified_time: str | None = None,
    structured_payload: list[dict] | None = None,
) -> dict:
    canonical = canonical_url or build_canonical_uri(request)
    resolved_og_image = og_image or build_absolute_uri(
        request, static("base/assets/img/ПОВНИЙ ЗНАК _О-16.svg"), canonical=True
    )
    resolved_og_alt = og_image_alt or og_title or meta_title

    payload = structured_payload or [organization_schema(request), website_schema(request)]

    return {
        "meta_title": meta_title,
        "meta_description": meta_description,
        "canonical_url": canonical,
        "meta_robots": meta_robots,
        "og_type": og_type,
        "og_title": og_title or meta_title,
        "og_image": resolved_og_image,
        "og_image_alt": resolved_og_alt,
        "meta_published_time": meta_published_time or "",
        "meta_modified_time": meta_modified_time or "",
        "structured_data": json.dumps(payload, ensure_ascii=False),
        "react_assets": resolve_react_assets(),
    }


def _render_react_spa(
    request,
    *,
    meta_title: str,
    meta_description: str = DEFAULT_META_DESCRIPTION,
    canonical_url: str | None = None,
    meta_robots: str = DEFAULT_INDEX_ROBOTS,
    og_type: str = "website",
    og_title: str | None = None,
    og_image: str | None = None,
    og_image_alt: str | None = None,
    meta_published_time: str | None = None,
    meta_modified_time: str | None = None,
    structured_payload: list[dict] | None = None,
    status: int = 200,
):
    context = _build_meta_context(
        request,
        meta_title=meta_title,
        meta_description=meta_description,
        canonical_url=canonical_url,
        meta_robots=meta_robots,
        og_type=og_type,
        og_title=og_title,
        og_image=og_image,
        og_image_alt=og_image_alt,
        meta_published_time=meta_published_time,
        meta_modified_time=meta_modified_time,
        structured_payload=structured_payload,
    )
    response = render(request, "react_spa.html", context, status=status)
    if meta_robots:
        response["X-Robots-Tag"] = meta_robots
    return response


def search_spa(request):
    canonical_url = _build_search_canonical_url(request)
    meta_robots = "noindex, follow" if _search_should_noindex(request) else DEFAULT_INDEX_ROBOTS
    meta_title = "Пошук нерухомості - DOMINIUM"
    meta_description = (
        "Підбір нерухомості DOMINIUM: квартири, будинки та комерційні обʼєкти "
        "з фільтрами за ціною, площею і кількістю кімнат."
    )

    return _render_react_spa(
        request,
        meta_title=meta_title,
        meta_description=meta_description,
        canonical_url=canonical_url,
        meta_robots=meta_robots,
        structured_payload=_build_search_structured_payload(
            request,
            canonical_url=canonical_url,
            meta_title=meta_title,
            meta_description=meta_description,
        ),
    )


def search_region_spa(request, region_slug):
    region = get_region_config(region_slug or "")
    if not region:
        raise Http404("Регіон не знайдено.")

    meta_title, meta_description = _build_search_scope_meta(region)
    canonical_url = _build_search_canonical_url(request)
    meta_robots = "noindex, follow" if _search_should_noindex(request) else DEFAULT_INDEX_ROBOTS

    return _render_react_spa(
        request,
        meta_title=meta_title,
        meta_description=meta_description,
        canonical_url=canonical_url,
        meta_robots=meta_robots,
        structured_payload=_build_search_structured_payload(
            request,
            canonical_url=canonical_url,
            meta_title=meta_title,
            meta_description=meta_description,
            scope_name=region.get("name", ""),
        ),
    )


def search_city_spa(request, city_slug):
    city = get_city_config(city_slug or "")
    if not city:
        raise Http404("Місто не знайдено.")

    meta_title, meta_description = _build_search_scope_meta(city)
    canonical_url = _build_search_canonical_url(request)
    meta_robots = "noindex, follow" if _search_should_noindex(request) else DEFAULT_INDEX_ROBOTS

    return _render_react_spa(
        request,
        meta_title=meta_title,
        meta_description=meta_description,
        canonical_url=canonical_url,
        meta_robots=meta_robots,
        structured_payload=_build_search_structured_payload(
            request,
            canonical_url=canonical_url,
            meta_title=meta_title,
            meta_description=meta_description,
            scope_name=city.get("city", ""),
        ),
    )


def likes_spa(request):
    return _render_react_spa(
        request,
        meta_title="Обране - DOMINIUM",
        meta_description="Збережені обʼєкти DOMINIUM для швидкого повернення до перегляду.",
        meta_robots="noindex, nofollow",
    )


def property_detail_spa(request, slug):
    property_obj = (
        Property.objects.filter(slug=slug)
        .select_related("property_type", "deal_type")
        .prefetch_related("images")
        .first()
    )
    if not property_obj:
        raise Http404("Property not found")

    canonical_url = build_absolute_uri(
        request,
        reverse("property_detail", kwargs={"slug": property_obj.slug}),
        canonical=True,
    )

    description = f"{property_obj.title} — {property_obj.address}".strip(" —")
    if not description:
        description = "Детальна сторінка обʼєкта нерухомості DOMINIUM."
    og_image, og_image_alt = _resolve_property_og_image(request, property_obj)

    return _render_react_spa(
        request,
        meta_title=f"{property_obj.title} - DOMINIUM",
        meta_description=description[:160],
        canonical_url=canonical_url,
        og_type="article",
        og_title=property_obj.title,
        og_image=og_image,
        og_image_alt=og_image_alt,
        meta_published_time=property_obj.created_at.isoformat()
        if property_obj.created_at
        else "",
        structured_payload=_build_property_structured_payload(
            request,
            property_obj=property_obj,
            canonical_url=canonical_url,
            og_image=og_image,
        ),
    )


def property_api_demo_spa(request):
    return _render_react_spa(
        request,
        meta_title="API Demo - DOMINIUM",
        meta_description="Демонстраційна SPA-сторінка тестування API нерухомості DOMINIUM.",
        meta_robots="noindex, nofollow",
    )


def property_api_admin_spa(request):
    return _render_react_spa(
        request,
        meta_title="API Admin - DOMINIUM",
        meta_description="Адміністративна SPA-сторінка керування обʼєктами через API DOMINIUM.",
        meta_robots="noindex, nofollow",
    )


def interactive_map_test_spa(request):
    return _render_react_spa(
        request,
        meta_title="Інтерактивна карта обʼєктів (тест) - DOMINIUM",
        meta_description=(
            "Тестова SPA-сторінка інтерактивної карти DOMINIUM для перевірки точок, "
            "попапів та фільтрації обʼєктів."
        ),
        meta_robots="noindex, nofollow",
    )


def signup_spa(request):
    method = (request.GET.get("method") or "email").lower()
    description = (
        "Переадресація на сценарій реєстрації через Google або email у SPA-інтерфейсі DOMINIUM."
    )

    canonical_url = build_canonical_uri(request, f"{reverse('landing')}?method={method}")

    return _render_react_spa(
        request,
        meta_title="Реєстрація - DOMINIUM",
        meta_description=description,
        canonical_url=canonical_url,
        meta_robots="noindex, nofollow",
    )

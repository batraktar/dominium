import json
import logging

import requests
from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.templatetags.static import static
from django.urls import reverse
from django.utils.html import strip_tags
from django.views.decorators.cache import cache_page
from django.views.decorators.http import require_GET, require_POST

from house.models import HomepageHighlightSettings, Property
from house.utils.sanitization import sanitize_rich_text
from dominium_backend.seo_regions import (
    DEFAULT_INDEX_ROBOTS,
    build_city_links,
    build_region_links,
)
from dominium_backend.forms.consultation import ConsultationForm

from .common import (
    build_absolute_uri,
    build_canonical_uri,
    get_client_ip,
    organization_schema,
    website_schema,
)

logger = logging.getLogger(__name__)


@require_POST
def consultation_view(request):
    form = ConsultationForm(request.POST)
    if not form.is_valid():
        errors = []
        for field_errors in form.errors.values():
            errors.extend(field_errors)
        return JsonResponse({"status": "error", "errors": errors}, status=400)

    ip = get_client_ip(request)
    cache_key = f"consultation-rate:{ip}"
    limit = getattr(settings, "CONSULTATION_RATE_LIMIT", 5)
    window = getattr(settings, "CONSULTATION_RATE_WINDOW", 600)

    current_hits = cache.get(cache_key, 0)
    if current_hits >= limit:
        return JsonResponse(
            {
                "status": "error",
                "message": "Ви надсилаєте запити надто часто. Спробуйте пізніше.",
            },
            status=429,
        )

    if current_hits == 0:
        cache.set(cache_key, 1, timeout=window)
    else:
        try:
            cache.incr(cache_key)
        except ValueError:
            cache.set(cache_key, 1, timeout=window)

    cleaned = form.cleaned_data
    email = cleaned.get("email") or ""
    property_url = cleaned.get("property") or "Не вказано"

    text = (
        "📩 *Нова заявка на консультацію*\n"
        f"👤 *Ім'я:* {cleaned['name']}\n"
        f"📞 *Телефон:* {cleaned['phone']}\n"
        f"✉️ *Пошта:* {email or 'Немає'}\n"
        f"📝 *Повідомлення:* {cleaned['message']}\n"
        f"🔗 *Посилання на об'єкт:* {property_url}"
    )

    telegram_token = getattr(settings, "TELEGRAM_BOT_TOKEN", "")
    chat_ids = getattr(settings, "TELEGRAM_CHAT_IDS", [])

    if not telegram_token or not chat_ids:
        logger.error("Налаштування Telegram відсутні.")
        return JsonResponse(
            {"status": "error", "message": "Налаштування Telegram відсутні."},
            status=500,
        )

    url = f"https://api.telegram.org/bot{telegram_token}/sendMessage"
    timeout = getattr(settings, "REQUESTS_TIMEOUT", 10)
    send_errors = []

    for chat_id in chat_ids:
        payload = {"chat_id": chat_id, "text": text, "parse_mode": "Markdown"}
        try:
            response = requests.post(url, json=payload, timeout=timeout)
            response.raise_for_status()
        except requests.RequestException as exc:
            logger.warning("Telegram недоступний (%s): %s", chat_id, exc)
            send_errors.append({"chat_id": chat_id, "error": str(exc)})

    if send_errors:
        return JsonResponse({"status": "error", "details": send_errors}, status=502)

    if request.user.is_authenticated:
        user = request.user
        updated_fields = []
        if cleaned["phone"] and getattr(user, "phone_number", None) != cleaned["phone"]:
            user.phone_number = cleaned["phone"]
            updated_fields.append("phone_number")
        if email and not user.email:
            user.email = email
            updated_fields.append("email")
        if updated_fields:
            user.save(update_fields=updated_fields)

    return JsonResponse({"status": "ok"}, status=200)


def property_detail(request, slug):
    property_obj = get_object_or_404(
        Property.objects.select_related("property_type", "deal_type").prefetch_related(
            "images", "features"
        ),
        slug=slug,
    )
    images = list(property_obj.images.all())
    features = list(property_obj.features.all())
    property_obj.absolute_url = build_canonical_uri(request, property_obj.get_absolute_url())
    main_image = next((image for image in images if image.is_main), None) or (
        images[0] if images else None
    )
    image_urls = [img.image.url for img in images]
    absolute_images = [build_absolute_uri(request, url, canonical=True) for url in image_urls]

    raw_description = strip_tags(sanitize_rich_text(property_obj.description or ""))
    compact_description = " ".join(raw_description.split())
    if not compact_description:
        compact_description = (
            f"{property_obj.title} — нерухомість DOMINIUM у {property_obj.address}."
        )
    meta_description = (
        compact_description[:157] + "…"
        if len(compact_description) > 160
        else compact_description
    )

    primary_image = build_absolute_uri(
        request,
        (
            main_image.image.url
            if main_image
            else static("base/assets/img/ПОВНИЙ ЗНАК _О-16.svg")
        ),
        canonical=True,
    )

    offers_data = {
        "@type": "Offer",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
    }
    if property_obj.price is not None:
        offers_data["price"] = float(property_obj.price)

    listing_schema = {
        "@context": "https://schema.org",
        "@type": "RealEstateListing",
        "name": property_obj.title,
        "url": property_obj.absolute_url,
        "mainEntityOfPage": property_obj.absolute_url,
        "description": compact_description,
        "image": absolute_images or [primary_image],
        "address": {
            "@type": "PostalAddress",
            "streetAddress": property_obj.address,
            "addressCountry": "UA",
        },
        "offers": offers_data,
        "numberOfRooms": property_obj.rooms,
        "datePosted": property_obj.created_at.date().isoformat(),
        "floorSize": {
            "@type": "QuantitativeValue",
            "value": property_obj.area,
            "unitCode": "SQM",
        },
        "category": (
            property_obj.property_type.name if property_obj.property_type else None
        ),
    }
    if property_obj.latitude is not None and property_obj.longitude is not None:
        listing_schema["geo"] = {
            "@type": "GeoCoordinates",
            "latitude": property_obj.latitude,
            "longitude": property_obj.longitude,
        }

    breadcrumb_schema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Головна",
                "item": build_canonical_uri(request, reverse("start_page")),
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": "Пошук",
                "item": build_canonical_uri(request, reverse("property_search")),
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": property_obj.title,
                "item": property_obj.absolute_url,
            },
        ],
    }

    structured_payload = [organization_schema(request), listing_schema, breadcrumb_schema]

    context = {
        "property": property_obj,
        "property_images": images,
        "property_features": features,
        "main_image": main_image,
        "user_is_staff": request.user.is_authenticated and request.user.is_staff,
        "meta_title": f"{property_obj.title} – DOMINIUM",
        "meta_description": meta_description,
        "canonical_url": property_obj.absolute_url,
        "meta_robots": DEFAULT_INDEX_ROBOTS,
        "og_type": "article",
        "og_title": property_obj.title,
        "og_image": primary_image,
        "og_image_alt": f"{property_obj.title} — {property_obj.address}",
        "structured_data": json.dumps(structured_payload, ensure_ascii=False),
    }
    response = render(
        request,
        "property_detail.html",
        context,
    )
    response["X-Robots-Tag"] = context["meta_robots"]
    return response


@cache_page(getattr(settings, "HOME_CACHE_SECONDS", 300))
def base(request):
    settings_obj = HomepageHighlightSettings.objects.prefetch_related(
        "property_types"
    ).first()
    limit = settings_obj.limit if settings_obj and settings_obj.limit else 3

    manual_qs = (
        Property.objects.filter(featured_homepage=True)
        .select_related("property_type", "deal_type")
        .prefetch_related("images")
        .order_by("-created_at")
    )
    selected_properties = list(manual_qs[:limit])
    selected_ids = {prop.id for prop in selected_properties}

    needed = limit - len(selected_properties)

    if needed > 0:
        auto_qs = Property.objects.exclude(id__in=selected_ids)
        if settings_obj:
            if settings_obj.price_min is not None:
                auto_qs = auto_qs.filter(price__gte=settings_obj.price_min)
            if settings_obj.price_max is not None:
                auto_qs = auto_qs.filter(price__lte=settings_obj.price_max)
            if settings_obj.region_keyword:
                auto_qs = auto_qs.filter(
                    address__icontains=settings_obj.region_keyword.strip()
                )
            property_types_ids = list(
                settings_obj.property_types.values_list("id", flat=True)
            )
            if property_types_ids:
                auto_qs = auto_qs.filter(property_type_id__in=property_types_ids)
        auto_qs = auto_qs.select_related("property_type", "deal_type").prefetch_related(
            "images"
        )

        auto_selected = list(auto_qs.order_by("?")[:needed])
        selected_properties.extend(auto_selected)
        selected_ids.update(prop.id for prop in auto_selected)
        needed = limit - len(selected_properties)

    if needed > 0:
        fallback_qs = (
            Property.objects.exclude(id__in=selected_ids)
            .select_related("property_type", "deal_type")
            .prefetch_related("images")
            .order_by("-created_at")[:needed]
        )
        selected_properties.extend(list(fallback_qs))

    selected_properties = selected_properties[:limit]

    for prop in selected_properties:
        prop.absolute_url = build_canonical_uri(request, prop.get_absolute_url())

    default_description = (
        "DOMINIUM — агенція нерухомості, що підбирає перевірені квартири та будинки в Україні. "
        "Пропонуємо індивідуальний супровід угод, експертні консультації та преміальні лоти."
    )

    structured = json.dumps(
        [
            organization_schema(request),
            website_schema(request),
        ],
        ensure_ascii=False,
    )

    context = {
        "properties": selected_properties,
        "meta_title": "DOMINIUM – Експертні рішення з нерухомості",
        "meta_description": default_description,
        "canonical_url": build_canonical_uri(request, request.path),
        "meta_robots": DEFAULT_INDEX_ROBOTS,
        "og_type": "website",
        "og_title": "DOMINIUM – Експертні рішення з нерухомості",
        "og_image": build_absolute_uri(
            request, static("base/assets/img/ПОВНИЙ ЗНАК _О-16.svg"), canonical=True
        ),
        "og_image_alt": "DOMINIUM Realty",
        "seo_region_links": build_region_links(),
        "seo_city_links": build_city_links()[:18],
        "structured_data": structured,
    }
    response = render(request, "home.html", context)
    response["X-Robots-Tag"] = context["meta_robots"]
    return response


def property_api_demo(request):
    return render(request, "api/property_api_demo.html")


def _build_map_properties(request, *, limit=500):
    properties = (
        Property.objects.filter(
            is_archived=False,
            latitude__isnull=False,
            longitude__isnull=False,
        )
        .select_related("property_type", "deal_type")
        .prefetch_related("images")
        .order_by("-created_at")[:limit]
    )

    map_properties = []
    for property_obj in properties:
        try:
            lat = float(property_obj.latitude)
            lon = float(property_obj.longitude)
        except (TypeError, ValueError):
            continue

        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            continue

        image_url = None
        try:
            main_image = property_obj.main_image
            if main_image and getattr(main_image, "image", None):
                image_url = build_absolute_uri(request, main_image.image.url)
        except Exception:
            image_url = None

        map_properties.append(
            {
                "id": property_obj.id,
                "title": strip_tags(property_obj.title or ""),
                "address": strip_tags(property_obj.address or ""),
                "price": float(property_obj.price) if property_obj.price is not None else None,
                "lat": lat,
                "lon": lon,
                "url": build_absolute_uri(request, property_obj.get_absolute_url()),
                "image": image_url,
                "property_type": (
                    property_obj.property_type.name if property_obj.property_type else ""
                ),
                "deal_type": property_obj.deal_type.name if property_obj.deal_type else "",
            }
        )

    return map_properties


def interactive_map_test(request):
    map_properties = _build_map_properties(request)

    context = {
        "map_properties": map_properties,
        "map_properties_count": len(map_properties),
        "meta_title": "Інтерактивна карта обʼєктів (тест) – DOMINIUM",
        "meta_description": (
            "Тестова сторінка інтерактивної карти DOMINIUM для перевірки точок "
            "нерухомості, попапів та навігації між обʼєктами."
        ),
        "canonical_url": build_canonical_uri(request, request.path),
        "meta_robots": "noindex, nofollow",
        "og_type": "website",
        "og_title": "Інтерактивна карта обʼєктів (тест) – DOMINIUM",
        "og_image": build_absolute_uri(
            request, static("base/assets/img/ПОВНИЙ ЗНАК _О-16.svg"), canonical=True
        ),
        "og_image_alt": "DOMINIUM map test",
    }
    response = render(request, "interactive_map_test.html", context)
    response["X-Robots-Tag"] = context["meta_robots"]
    return response


@require_GET
def interactive_map_test_data(request):
    map_properties = _build_map_properties(request)
    return JsonResponse(
        {
            "count": len(map_properties),
            "results": map_properties,
        }
    )

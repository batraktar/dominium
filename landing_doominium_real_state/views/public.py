import json
import logging

import requests
from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.templatetags.static import static
from django.utils.html import strip_tags
from django.views.decorators.cache import cache_page
from django.views.decorators.http import require_POST

from house.models import HomepageHighlightSettings, Property
from landing_doominium_real_state.forms.consultation import ConsultationForm

from .common import build_absolute_uri, get_client_ip, organization_schema

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
    property_obj = get_object_or_404(Property, slug=slug)
    images = property_obj.images.all()
    property_obj.absolute_url = request.build_absolute_uri(
        property_obj.get_absolute_url()
    )
    main_image = images.filter(is_main=True).first() or images.first()
    image_urls = [img.image.url for img in images]
    absolute_images = [build_absolute_uri(request, url) for url in image_urls]

    raw_description = strip_tags(property_obj.description or "")
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
        "description": compact_description,
        "image": absolute_images or [primary_image],
        "address": {
            "@type": "PostalAddress",
            "streetAddress": property_obj.address,
            "addressCountry": "UA",
        },
        "offers": offers_data,
        "numberOfRooms": property_obj.rooms,
        "floorSize": {
            "@type": "QuantitativeValue",
            "value": property_obj.area,
            "unitCode": "SQM",
        },
        "category": (
            property_obj.property_type.name if property_obj.property_type else None
        ),
    }

    structured_payload = [organization_schema(request), listing_schema]

    return render(
        request,
        "property_detail.html",
        {
            "property": property_obj,
            "main_image": main_image,
            "property_images_json": json.dumps(image_urls),
            "user_is_staff": request.user.is_authenticated and request.user.is_staff,
            "meta_title": f"{property_obj.title} – DOMINIUM",
            "meta_description": meta_description,
            "canonical_url": property_obj.absolute_url,
            "og_type": "article",
            "og_title": property_obj.title,
            "og_image": primary_image,
            "structured_data": json.dumps(structured_payload, ensure_ascii=False),
        },
    )


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
        prop.absolute_url = request.build_absolute_uri(prop.get_absolute_url())

    default_description = (
        "DOMINIUM — агенція нерухомості, що підбирає перевірені квартири та будинки в Україні. "
        "Пропонуємо індивідуальний супровід угод, експертні консультації та преміальні лоти."
    )

    structured = json.dumps(
        organization_schema(request),
        ensure_ascii=False,
    )

    context = {
        "properties": selected_properties,
        "meta_title": "DOMINIUM – Експертні рішення з нерухомості",
        "meta_description": default_description,
        "canonical_url": request.build_absolute_uri(),
        "og_type": "website",
        "og_title": "DOMINIUM – Експертні рішення з нерухомості",
        "og_image": build_absolute_uri(
            request, static("base/assets/img/ПОВНИЙ ЗНАК _О-16.svg")
        ),
        "structured_data": structured,
    }
    return render(request, "home.html", context)


def property_api_demo(request):
    return render(request, "api/property_api_demo.html")

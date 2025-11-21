import json
import logging
from datetime import date
from decimal import Decimal, ROUND_HALF_UP

import requests
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.core.cache import cache
from django.core.paginator import Paginator
from django.db.models import Q
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.template.loader import render_to_string
from django.templatetags.static import static
from django.utils.html import strip_tags
from django.urls import reverse
from django.views.decorators.http import require_GET, require_POST
from django.views.generic import ListView

from accounts.models import Favorite, SavedSearch
from house.models import HomepageHighlightSettings, Property, PropertyType
from house.utils.currency import get_exchange_rates as fetch_exchange_rates
from landing_doominium_real_state.forms import ConsultationForm


logger = logging.getLogger(__name__)


def build_absolute_uri(request, path: str | None) -> str:
    if not path:
        return request.build_absolute_uri()
    if path.startswith("http://") or path.startswith("https://"):
        return path
    return request.build_absolute_uri(path)


def organization_schema(request) -> dict:
    logo_url = build_absolute_uri(
        request, static("base/assets/img/ПОВНИЙ ЗНАК _О-16.svg")
    )
    return {
        "@context": "https://schema.org",
        "@type": "RealEstateAgent",
        "name": "DOMINIUM Realty",
        "url": build_absolute_uri(request, "/"),
        "logo": logo_url,
        "image": logo_url,
        "telephone": "+380730032121",
        "address": {
            "@type": "PostalAddress",
            "addressCountry": "UA",
            "addressLocality": "Київ",
            "streetAddress": "DOMINIUM Realty",
        },
        "sameAs": [
            "https://t.me/dominium_realty_agency",
            "https://www.facebook.com/DOMINIUM.REALTY.AGENCY",
        ],
    }


@login_required
def liked_properties_view(request):
    favorites = (
        Favorite.objects.filter(user=request.user)
        .select_related(
            "property__deal_type",
            "property__property_type",
        )
        .prefetch_related("property__images")
    )
    properties = [fav.property for fav in favorites]
    for property in properties:
        property.absolute_url = request.build_absolute_uri(property.get_absolute_url())
    return render(request, "likes.html", {"properties": properties})


@require_POST
@login_required
def toggle_like(request, property_id):
    property = get_object_or_404(Property, id=property_id)
    favorite, created = Favorite.objects.get_or_create(
        user=request.user, property=property
    )

    if not created:
        favorite.delete()
        return JsonResponse({"status": "unliked"})
    return JsonResponse({"status": "liked"})


@require_POST
@login_required
def toggle_featured_homepage(request, property_id):
    if not request.user.is_staff:
        return JsonResponse({"error": "forbidden"}, status=403)

    property = get_object_or_404(Property, id=property_id)
    desired = request.POST.get("featured")

    if desired in {"true", "false"}:
        property.featured_homepage = desired == "true"
    else:
        property.featured_homepage = not property.featured_homepage

    property.save(update_fields=["featured_homepage"])
    return JsonResponse({"status": "ok", "featured": property.featured_homepage})


@require_POST
def save_search(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "invalid_json"}, status=400)

    params = payload.get("params")
    if not isinstance(params, dict):
        return JsonResponse({"error": "invalid_params"}, status=400)

    title = (payload.get("title") or "").strip() or "Збережений пошук"
    notify = bool(payload.get("notify"))
    email = (payload.get("email") or "").strip() or None

    user = request.user if request.user.is_authenticated else None
    if user:
        if not email:
            email = user.email or None
        if SavedSearch.objects.filter(user=user).count() >= 20:
            return JsonResponse({"error": "limit_reached"}, status=400)
    else:
        if not email:
            return JsonResponse({"error": "email_required"}, status=400)

    existing = None
    if user:
        existing = SavedSearch.objects.filter(user=user, params=params).first()
    elif email:
        existing = SavedSearch.objects.filter(
            user__isnull=True, email=email, params=params
        ).first()

    if existing:
        existing.notify = notify
        existing.title = title
        existing.save(update_fields=["notify", "title"])
        saved = existing
    else:
        saved = SavedSearch.objects.create(
            user=user,
            email=email,
            title=title,
            params=params,
            notify=notify,
        )

    return JsonResponse({"status": "ok", "id": saved.id})


def search_properties(request):
    sort_option = request.GET.get("sort", "price_asc")
    sort_map = {
        "price_asc": "price",
        "price_desc": "-price",
        "area_asc": "area",
        "area_desc": "-area",
        "date": "-created_at",
    }
    sort_field = sort_map.get(sort_option, "price")

    queryset = Property.objects.all()

    # Фільтр: кількість кімнат
    rooms = request.GET.get("rooms")
    if rooms:
        queryset = queryset.filter(rooms=rooms)

    # Фільтр: тип нерухомості
    property_type = request.GET.get("property_type")
    if property_type:
        queryset = queryset.filter(property_type_id=property_type)

    queryset = queryset.order_by(sort_field)

    # Пагінація
    paginator = Paginator(queryset, 15)
    page_number = request.GET.get("page")
    page_obj = paginator.get_page(page_number)

    context = {
        "properties": page_obj,
        "paginator": paginator,
        "page_obj": page_obj,
        "is_paginated": page_obj.has_other_pages(),
        "found_count": paginator.count,
        "sort_option": sort_option,
        "property_types": PropertyType.objects.all(),  # для фільтрів
    }

    return render(request, "search_filters.html", context)


def _get_client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


@require_POST
def consultation_view(request):
    form = ConsultationForm(request.POST)
    if not form.is_valid():
        errors = []
        for field_errors in form.errors.values():
            errors.extend(field_errors)
        return JsonResponse({"status": "error", "errors": errors}, status=400)

    ip = _get_client_ip(request)
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
    property = get_object_or_404(Property, slug=slug)
    images = property.images.all()
    property.absolute_url = request.build_absolute_uri(property.get_absolute_url())
    main_image = images.filter(is_main=True).first() or images.first()
    image_urls = [img.image.url for img in images]
    absolute_images = [build_absolute_uri(request, url) for url in image_urls]

    raw_description = strip_tags(property.description or "")
    compact_description = " ".join(raw_description.split())
    if not compact_description:
        compact_description = (
            f"{property.title} — нерухомість DOMINIUM у {property.address}."
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
    if property.price is not None:
        offers_data["price"] = float(property.price)

    listing_schema = {
        "@context": "https://schema.org",
        "@type": "RealEstateListing",
        "name": property.title,
        "url": property.absolute_url,
        "description": compact_description,
        "image": absolute_images or [primary_image],
        "address": {
            "@type": "PostalAddress",
            "streetAddress": property.address,
            "addressCountry": "UA",
        },
        "offers": offers_data,
        "numberOfRooms": property.rooms,
        "floorSize": {
            "@type": "QuantitativeValue",
            "value": property.area,
            "unitCode": "SQM",
        },
        "category": property.property_type.name if property.property_type else None,
    }

    structured_payload = [organization_schema(request), listing_schema]

    return render(
        request,
        "property_detail.html",
        {
            "property": property,
            "main_image": main_image,
            "property_images_json": json.dumps(image_urls),
            "user_is_staff": request.user.is_authenticated and request.user.is_staff,
            "meta_title": f"{property.title} – DOMINIUM",
            "meta_description": meta_description,
            "canonical_url": property.absolute_url,
            "og_type": "article",
            "og_title": property.title,
            "og_image": primary_image,
            "structured_data": json.dumps(structured_payload, ensure_ascii=False),
        },
    )


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


def property_api_admin(request):
    return render(request, "api/property_api_admin.html")


class SearchFiltersView(ListView):
    PAGE_SIZE_CHOICES = (9, 12, 18, 24)
    DEFAULT_PAGE_SIZE = PAGE_SIZE_CHOICES[0]
    CURRENCY_OPTIONS = {
        "USD": {"symbol": "$", "label": "USD"},
        "EUR": {"symbol": "€", "label": "EUR"},
        "UAH": {"symbol": "₴", "label": "UAH"},
    }

    model = Property
    context_object_name = "properties"
    template_name = "search_filters.html"
    paginate_by = DEFAULT_PAGE_SIZE

    def get_paginate_by(self, queryset):
        per_page = self.request.GET.get("per_page")
        try:
            per_page = int(per_page)
        except (TypeError, ValueError):
            per_page = self.DEFAULT_PAGE_SIZE

        if per_page not in self.PAGE_SIZE_CHOICES:
            per_page = self.DEFAULT_PAGE_SIZE

        self.paginate_by = per_page
        self.selected_page_size = per_page
        return per_page

    def get_selected_currency(self):
        currency = (self.request.GET.get("currency") or "USD").upper()
        if currency not in self.CURRENCY_OPTIONS:
            currency = "USD"
        self.selected_currency = currency
        return currency

    def get_queryset(self):
        queryset = super().get_queryset()
        q = self.request.GET

        # 🔍 Пошук по тексту
        query = q.get("q")
        if query:
            queryset = queryset.filter(
                Q(title__icontains=query)
                | Q(address__icontains=query)
                | Q(deal_type__name__icontains=query)
            )

        # 🔹 Тип нерухомості
        property_type_slugs = q.getlist("property_type")
        if property_type_slugs:
            queryset = queryset.filter(property_type__slug__in=property_type_slugs)

        # 🔹 Тип угоди: Оренда / Продаж
        deal_type_value = q.get("deal_type")
        if deal_type_value:
            queryset = queryset.filter(deal_type__name__iexact=deal_type_value.strip())

        # 🔹 Площа
        if q.get("area_min"):
            queryset = queryset.filter(area__gte=q["area_min"])
        if q.get("area_max"):
            queryset = queryset.filter(area__lte=q["area_max"])

        # 🔹 Ціна
        if q.get("price_min"):
            queryset = queryset.filter(price__gte=q["price_min"])
        if q.get("price_max"):
            queryset = queryset.filter(price__lte=q["price_max"])

        # 🔹 Кімнати (слайдер)
        rooms_min_value = q.get("rooms_min")
        rooms_max_value = q.get("rooms_max")
        rooms_filtered = False
        try:
            if rooms_min_value not in (None, ""):
                queryset = queryset.filter(rooms__gte=int(rooms_min_value))
                rooms_filtered = True
            if rooms_max_value not in (None, ""):
                max_rooms = int(rooms_max_value)
                if max_rooms < 6:  # 6 означає "6+"
                    queryset = queryset.filter(rooms__lte=max_rooms)
                rooms_filtered = True
        except (TypeError, ValueError):
            pass

        # сумісність зі старими параметрами
        if not rooms_filtered:
            room_values = q.get("rooms", "")
            if room_values:
                room_list = [r.strip() for r in room_values.split(",") if r.strip()]
                exact_rooms = []
                gte_5 = False
                for r in room_list:
                    if r == "5+":
                        gte_5 = True
                    elif r.isdigit():
                        exact_rooms.append(int(r))
                room_filter = Q()
                if exact_rooms:
                    room_filter |= Q(rooms__in=exact_rooms)
                if gte_5:
                    room_filter |= Q(rooms__gte=5)
                queryset = queryset.filter(room_filter)

        # 🔹 Сортування
        sort_option = q.get("sort", "date")
        sort_map = {
            "price_asc": "price",
            "price_desc": "-price",
            "area_asc": "area",
            "area_desc": "-area",
            "date": "-created_at",
        }

        return queryset.order_by(sort_map.get(sort_option, "date"))

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        selected_currency = getattr(
            self, "selected_currency", self.get_selected_currency()
        )

        rates = fetch_exchange_rates()
        usd_rate = Decimal(str(rates.get("USD") or 40))
        eur_rate = Decimal(str(rates.get("EUR") or 43.5))
        uah_rate = Decimal(str(rates.get("UAH") or 1))

        quantize_unit = Decimal("1")
        for prop in context["properties"]:
            price_usd = (
                Decimal(str(prop.price)) if prop.price is not None else Decimal("0")
            )

            price_uah = (price_usd * usd_rate / uah_rate).quantize(
                quantize_unit, rounding=ROUND_HALF_UP
            )
            price_eur = (
                (price_usd * usd_rate / eur_rate).quantize(
                    quantize_unit, rounding=ROUND_HALF_UP
                )
                if eur_rate
                else Decimal("0")
            )
            price_usd_rounded = price_usd.quantize(
                quantize_unit, rounding=ROUND_HALF_UP
            )

            prop.price_uah = int(price_uah)
            prop.price_eur = int(price_eur)
            prop.price_usd_display = int(price_usd_rounded)

            conversions = {
                "USD": int(price_usd_rounded),
                "EUR": int(price_eur),
                "UAH": int(price_uah),
            }

            prop.display_currency_code = selected_currency
            prop.display_currency_symbol = self.CURRENCY_OPTIONS[selected_currency][
                "symbol"
            ]
            prop.display_price = conversions[selected_currency]
            prop.other_currency_values = [
                {
                    "code": code,
                    "symbol": data["symbol"],
                    "value": conversions[code],
                }
                for code, data in self.CURRENCY_OPTIONS.items()
                if code != selected_currency
            ]

        context["room_options"] = ["", "1", "2", "3", "4", "5+"]
        paginator = context.get("paginator")
        context["found_count"] = (
            paginator.count if paginator else context["properties"].count()
        )
        context["sort_option"] = self.request.GET.get("sort", "date")
        context["property_types"] = PropertyType.objects.all()
        context["usd_rate"] = usd_rate
        context["eur_rate"] = eur_rate
        context["today_date"] = date.today().strftime("%d.%m.%Y")
        context["user_is_authenticated"] = self.request.user.is_authenticated
        context["selected_property_types"] = self.request.GET.getlist("property_type")
        params = self.request.GET.copy()
        params.pop("page", None)
        params.pop("per_page", None)
        params.pop("currency", None)
        context["querystring"] = params.urlencode()
        context["per_page_options"] = self.PAGE_SIZE_CHOICES
        context["per_page_selected"] = getattr(
            self, "selected_page_size", self.DEFAULT_PAGE_SIZE
        )
        context["currency_options"] = [
            {"code": code, "label": f"{data['label']} ({data['symbol']})"}
            for code, data in self.CURRENCY_OPTIONS.items()
        ]
        context["selected_currency"] = selected_currency
        context["currency_symbol"] = self.CURRENCY_OPTIONS[selected_currency]["symbol"]
        context["currency_other_list"] = [
            {"code": code, "symbol": data["symbol"]}
            for code, data in self.CURRENCY_OPTIONS.items()
            if code != selected_currency
        ]
        for prop in context["properties"]:
            prop.absolute_url = self.request.build_absolute_uri(prop.get_absolute_url())

        rooms_slider_min = self.request.GET.get("rooms_min", "")
        rooms_slider_max = self.request.GET.get("rooms_max", "")
        if not rooms_slider_min and not rooms_slider_max:
            legacy_rooms = self.request.GET.get("rooms")
            if legacy_rooms:
                legacy_list = [
                    value.strip() for value in legacy_rooms.split(",") if value.strip()
                ]
                numeric_values = []
                has_plus = False
                for value in legacy_list:
                    if value == "5+":
                        has_plus = True
                    elif value.isdigit():
                        numeric_values.append(int(value))
                if numeric_values:
                    rooms_slider_min = str(min(numeric_values))
                    if not has_plus:
                        rooms_slider_max = str(max(numeric_values))
                if has_plus:
                    rooms_slider_max = "6"

        context["rooms_slider_min"] = rooms_slider_min
        context["rooms_slider_max"] = rooms_slider_max

        total_count = context["found_count"]
        search_summary = (
            f"Знайдено {total_count} обʼєктів нерухомості DOMINIUM"
            if total_count
            else "DOMINIUM — розумний пошук нерухомості"
        )
        context["meta_title"] = "Пошук нерухомості – DOMINIUM"
        context["meta_description"] = (
            f"{search_summary}. Підберіть квартири та будинки за ціною, типом та кімнатами з агентством DOMINIUM."[
                :160
            ]
        )
        context["canonical_url"] = self.request.build_absolute_uri()
        context["og_type"] = "website"
        context["og_title"] = "Пошук нерухомості – DOMINIUM"
        context["og_image"] = build_absolute_uri(
            self.request, static("base/assets/img/ПОВНИЙ ЗНАК _О-16.svg")
        )
        context["structured_data"] = json.dumps(
            organization_schema(self.request), ensure_ascii=False
        )

        return context

    def render_to_response(self, context, **response_kwargs):
        if self.request.headers.get("x-requested-with") == "XMLHttpRequest":
            html = render_to_string(
                "partials/property_cards.html", context, request=self.request
            )
            return HttpResponse(html)
        return super().render_to_response(context, **response_kwargs)


def signup(request):
    method = (request.GET.get("method") or "email").lower()
    target = reverse("start_page")
    query = f"register={method}"
    extra = request.GET.copy()
    extra.pop("method", None)
    if extra:
        query = query + "&" + extra.urlencode()
    return redirect(f"{target}?{query}")

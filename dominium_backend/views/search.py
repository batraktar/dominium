import json
from datetime import date

from django.conf import settings
from django.core.paginator import Paginator
from django.db.models import Q
from django.http import Http404, JsonResponse
from django.shortcuts import render
from django.template.loader import render_to_string
from django.templatetags.static import static
from django.urls import reverse
from django.views.decorators.cache import cache_page
from django.views.decorators.http import require_GET
from django.views.generic import ListView

from house.models import Property, PropertyType
from house.services.search import apply_currency_display, build_search_queryset
from house.utils.currency import get_exchange_rates as fetch_exchange_rates
from dominium_backend.seo_regions import (
    DEFAULT_INDEX_ROBOTS,
    build_city_links,
    build_region_links,
    collect_city_keywords,
    collect_region_keywords,
    get_city_config,
    get_region_config,
)

from .common import (
    build_absolute_uri,
    build_canonical_request_url,
    build_canonical_uri,
    canonical_query_string,
    organization_schema,
)

CANONICAL_IGNORED_PARAMS = {"page", "per_page", "sort", "currency"}


def _build_item_list_schema(request, properties) -> dict | None:
    elements = []
    for position, property_obj in enumerate(properties, start=1):
        item_url = getattr(property_obj, "absolute_url", None)
        if not item_url:
            item_url = property_obj.get_absolute_url()

        list_item = {
            "@type": "ListItem",
            "position": position,
            "name": property_obj.title,
            "url": item_url,
        }
        images = list(property_obj.images.all())
        main_image = next((img for img in images if img.is_main), images[0] if images else None)
        if main_image and getattr(main_image, "image", None):
            list_item["image"] = build_absolute_uri(
                request,
                main_image.image.url,
                canonical=True,
            )
        elements.append(list_item)

    if not elements:
        return None

    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": elements,
    }


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


def _build_canonical_url(request) -> str:
    return build_canonical_request_url(
        request,
        ignored_query_params=CANONICAL_IGNORED_PARAMS,
        drop_tracking_params=True,
    )


def _should_noindex(request, page_number: int) -> bool:
    if page_number > 1:
        return True

    return bool(
        canonical_query_string(
            request,
            ignored_query_params=CANONICAL_IGNORED_PARAMS,
            drop_tracking_params=True,
        )
    )


def _build_page_url(request, page_number: int) -> str:
    params = request.GET.copy()
    if page_number <= 1:
        params.pop("page", None)
    else:
        params["page"] = str(page_number)
    query = params.urlencode()
    path = request.path
    if query:
        path = f"{path}?{query}"
    return build_canonical_uri(request, path)


@require_GET
def search_properties(request):
    sort_option = request.GET.get("sort", "price_asc")

    queryset = build_search_queryset(
        Property.objects.all(),
        request.GET,
        default_sort="price_asc",
    )

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
        "property_types": PropertyType.objects.all(),
    }

    return render(request, "search_filters.html", context)


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

    def dispatch(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            return super().dispatch(request, *args, **kwargs)
        cached_dispatch = cache_page(getattr(settings, "SEARCH_CACHE_SECONDS", 60))(
            super().dispatch
        )
        return cached_dispatch(request, *args, **kwargs)

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

    def get_region_data(self):
        return None

    def get_base_queryset(self):
        return (
            super()
            .get_queryset()
            .select_related("property_type", "deal_type")
            .prefetch_related("images")
            .filter(is_archived=False)
        )

    def get_queryset(self):
        return build_search_queryset(self.get_base_queryset(), self.request.GET)

    def _seo_copy(self, total_count: int) -> tuple[str, str]:
        region = self.get_region_data()
        if region:
            title = f"{region['title']} — DOMINIUM"
            description = (
                f"{region['description']} Знайдено {total_count} обʼєктів. "
                "DOMINIUM: фільтрація за ціною, площею, кімнатами та типом угоди."
            )
            return title, description[:160]

        search_summary = (
            f"Знайдено {total_count} обʼєктів нерухомості DOMINIUM"
            if total_count
            else "DOMINIUM — розумний пошук нерухомості"
        )
        title = "Пошук нерухомості – DOMINIUM"
        description = (
            f"{search_summary}. "
            "Підберіть квартири та будинки за ціною, типом та кімнатами з агентством DOMINIUM."
        )
        return title, description[:160]

    def _build_structured_data(
        self,
        *,
        canonical_url: str,
        meta_title: str,
        meta_description: str,
        properties,
    ) -> str:
        payload: list[dict] = [organization_schema(self.request)]

        payload.append(
            {
                "@context": "https://schema.org",
                "@type": "CollectionPage",
                "name": meta_title,
                "url": canonical_url,
                "description": meta_description,
                "inLanguage": "uk-UA",
            }
        )

        item_list_schema = _build_item_list_schema(self.request, properties)
        if item_list_schema:
            payload.append(item_list_schema)

        breadcrumb_items = [
            {
                "name": "Головна",
                "url": build_canonical_uri(self.request, reverse("start_page")),
            },
            {
                "name": "Пошук",
                "url": build_canonical_uri(self.request, reverse("property_search")),
            },
        ]
        region = self.get_region_data()
        if region:
            breadcrumb_items.append({"name": region["name"], "url": canonical_url})

        payload.append(_build_breadcrumb_schema(breadcrumb_items))
        return json.dumps(payload, ensure_ascii=False)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        selected_currency = getattr(
            self, "selected_currency", self.get_selected_currency()
        )

        rates = fetch_exchange_rates()
        rates_meta = apply_currency_display(
            context["properties"],
            rates,
            self.CURRENCY_OPTIONS,
            selected_currency,
        )

        context["room_options"] = ["", "1", "2", "3", "4", "5+"]
        paginator = context.get("paginator")
        context["found_count"] = (
            paginator.count if paginator else context["properties"].count()
        )
        context["sort_option"] = self.request.GET.get("sort", "date")
        context["property_types"] = PropertyType.objects.all()
        context["usd_rate"] = rates_meta["usd_rate"]
        context["eur_rate"] = rates_meta["eur_rate"]
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
            prop.absolute_url = build_canonical_uri(self.request, prop.get_absolute_url())

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
        meta_title, meta_description = self._seo_copy(total_count)
        canonical_url = _build_canonical_url(self.request)

        page_obj = context.get("page_obj")
        page_number = page_obj.number if page_obj else 1
        context["meta_robots"] = (
            "noindex, follow"
            if _should_noindex(self.request, page_number)
            else DEFAULT_INDEX_ROBOTS
        )
        if page_obj and page_obj.has_previous():
            context["prev_page_url"] = _build_page_url(
                self.request, page_obj.previous_page_number()
            )
        if page_obj and page_obj.has_next():
            context["next_page_url"] = _build_page_url(
                self.request, page_obj.next_page_number()
            )

        region = self.get_region_data()
        context["seo_heading"] = (
            region["title"] if region else "Пошук нерухомості в Україні"
        )
        context["seo_intro"] = (
            region.get("hero")
            if region
            else (
                "Каталог DOMINIUM з актуальними обʼєктами нерухомості по Україні. "
                "Використовуйте фільтри, щоб швидко знайти релевантні варіанти."
            )
        )
        context["seo_region_links"] = build_region_links()
        context["active_region_slug"] = region["slug"] if region else ""
        region_scope_slug = (
            region.get("region_slug")
            if region and region.get("region_slug")
            else (region.get("slug") if region else "")
        )
        context["seo_city_links"] = build_city_links(region_scope_slug)[:18]
        context["active_city_slug"] = (
            region.get("slug") if region and region.get("region_slug") else ""
        )

        context["meta_title"] = meta_title
        context["meta_description"] = meta_description
        context["canonical_url"] = canonical_url
        context["og_type"] = "website"
        context["og_title"] = meta_title
        default_og_image = build_absolute_uri(
            self.request,
            static("base/assets/img/ПОВНИЙ ЗНАК _О-16.svg"),
            canonical=True,
        )
        selected_og_image = default_og_image
        selected_og_image_alt = meta_title
        for property_obj in context["properties"]:
            images = list(property_obj.images.all())
            main_image = next(
                (image for image in images if getattr(image, "is_main", False)),
                images[0] if images else None,
            )
            if not main_image or not getattr(main_image, "image", None):
                continue
            selected_og_image = build_absolute_uri(
                self.request,
                main_image.image.url,
                canonical=True,
            )
            selected_og_image_alt = (
                f"{property_obj.title} — {property_obj.address}"
            )
            break

        context["og_image"] = selected_og_image
        context["og_image_alt"] = selected_og_image_alt
        context["structured_data"] = self._build_structured_data(
            canonical_url=canonical_url,
            meta_title=meta_title,
            meta_description=meta_description,
            properties=context["properties"],
        )

        return context

    def render_to_response(self, context, **response_kwargs):
        is_async = self.request.headers.get("x-dominium-async") == "search" or (
            self.request.headers.get("x-requested-with") == "XMLHttpRequest"
            and "application/json" in self.request.headers.get("accept", "")
        )
        if is_async:
            cards_html = render_to_string(
                "partials/property_cards.html", context, request=self.request
            )
            sort_html = render_to_string(
                "partials/property_sort_bar.html", context, request=self.request
            )
            info_html = render_to_string(
                "partials/property_list.html", context, request=self.request
            )
            return JsonResponse(
                {
                    "cards": cards_html,
                    "sort_bar": sort_html,
                    "summary": info_html,
                    "url": self.request.get_full_path(),
                }
            )
        response = super().render_to_response(context, **response_kwargs)
        meta_robots = context.get("meta_robots", "")
        if meta_robots:
            response["X-Robots-Tag"] = meta_robots
        return response


class RegionLandingView(SearchFiltersView):
    def dispatch(self, request, *args, **kwargs):
        region_slug = kwargs.get("region_slug")
        self.region_data = get_region_config(region_slug or "")
        if not self.region_data:
            raise Http404("Регіон не знайдено.")
        self.region_data = {**self.region_data, "slug": region_slug}
        return super().dispatch(request, *args, **kwargs)

    def get_region_data(self):
        return getattr(self, "region_data", None)

    def get_base_queryset(self):
        queryset = super().get_base_queryset()
        region = self.get_region_data() or {}
        keywords = collect_region_keywords(region.get("slug", ""))
        if not keywords:
            return queryset.none()

        region_filter = Q()
        for keyword in keywords:
            region_filter |= Q(address__icontains=keyword) | Q(title__icontains=keyword)
        return queryset.filter(region_filter)


class CityLandingView(SearchFiltersView):
    def dispatch(self, request, *args, **kwargs):
        city_slug = kwargs.get("city_slug")
        self.city_data = get_city_config(city_slug or "")
        if not self.city_data:
            raise Http404("Місто не знайдено.")
        self.city_data = {**self.city_data, "slug": city_slug}
        return super().dispatch(request, *args, **kwargs)

    def get_region_data(self):
        return getattr(self, "city_data", None)

    def get_base_queryset(self):
        queryset = super().get_base_queryset()
        city = self.get_region_data() or {}
        keywords = collect_city_keywords(city.get("slug", ""))
        if not keywords:
            return queryset.none()

        city_filter = Q()
        for keyword in keywords:
            city_filter |= Q(address__icontains=keyword) | Q(title__icontains=keyword)
        return queryset.filter(city_filter)

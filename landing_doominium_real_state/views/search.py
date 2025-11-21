import json
from datetime import date

from django.conf import settings
from django.core.paginator import Paginator
from django.http import JsonResponse
from django.shortcuts import render
from django.template.loader import render_to_string
from django.templatetags.static import static
from django.views.decorators.cache import cache_page
from django.views.decorators.http import require_GET
from django.views.generic import ListView

from house.models import Property, PropertyType
from house.services.search import apply_currency_display, build_search_queryset
from house.utils.currency import get_exchange_rates as fetch_exchange_rates

from .common import build_absolute_uri, organization_schema


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

    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = queryset.filter(is_archived=False)
        return build_search_queryset(queryset, self.request.GET)

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
        description_text = (
            f"{search_summary}. "
            "Підберіть квартири та будинки за ціною, типом та кімнатами з агентством DOMINIUM."
        )
        context["meta_description"] = description_text[:160]
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
        return super().render_to_response(context, **response_kwargs)

from decimal import ROUND_HALF_UP, Decimal

from django.db.models import Q

SORT_MAP = {
    "price_asc": "price",
    "price_desc": "-price",
    "area_asc": "area",
    "area_desc": "-area",
    "date": "-created_at",
}


def build_search_queryset(queryset, params, *, default_sort: str = "date"):
    q = params

    query = q.get("q")
    if query:
        queryset = queryset.filter(
            Q(title__icontains=query)
            | Q(address__icontains=query)
            | Q(deal_type__name__icontains=query)
        )

    property_type_slugs = q.getlist("property_type")
    if property_type_slugs:
        queryset = queryset.filter(property_type__slug__in=property_type_slugs)

    deal_type_value = q.get("deal_type")
    if deal_type_value:
        queryset = queryset.filter(deal_type__name__iexact=deal_type_value.strip())

    if q.get("area_min"):
        queryset = queryset.filter(area__gte=q["area_min"])
    if q.get("area_max"):
        queryset = queryset.filter(area__lte=q["area_max"])

    if q.get("price_min"):
        queryset = queryset.filter(price__gte=q["price_min"])
    if q.get("price_max"):
        queryset = queryset.filter(price__lte=q["price_max"])

    rooms_min_value = q.get("rooms_min")
    rooms_max_value = q.get("rooms_max")
    rooms_filtered = False
    try:
        if rooms_min_value not in (None, ""):
            queryset = queryset.filter(rooms__gte=int(rooms_min_value))
            rooms_filtered = True
        if rooms_max_value not in (None, ""):
            max_rooms = int(rooms_max_value)
            if max_rooms < 6:
                queryset = queryset.filter(rooms__lte=max_rooms)
            rooms_filtered = True
    except (TypeError, ValueError):
        pass

    if not rooms_filtered:
        room_values = q.get("rooms", "")
        if room_values:
            room_list = [
                value.strip() for value in room_values.split(",") if value.strip()
            ]
            exact_rooms = []
            gte_five = False
            for value in room_list:
                if value == "5+":
                    gte_five = True
                elif value.isdigit():
                    exact_rooms.append(int(value))
            room_filter = Q()
            if exact_rooms:
                room_filter |= Q(rooms__in=exact_rooms)
            if gte_five:
                room_filter |= Q(rooms__gte=5)
            queryset = queryset.filter(room_filter)

    sort_option = q.get("sort", default_sort)
    ordered_by = SORT_MAP.get(sort_option, SORT_MAP.get(default_sort, "-created_at"))
    return queryset.order_by(ordered_by)


def apply_currency_display(properties, rates, currency_options, selected_currency):
    usd_rate = Decimal(str(rates.get("USD") or 40))
    eur_rate = Decimal(str(rates.get("EUR") or 43.5))
    uah_rate = Decimal(str(rates.get("UAH") or 1))

    quantize_unit = Decimal("1")
    for property_obj in properties:
        price_usd = (
            Decimal(str(property_obj.price))
            if property_obj.price is not None
            else Decimal("0")
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
        price_usd_rounded = price_usd.quantize(quantize_unit, rounding=ROUND_HALF_UP)

        property_obj.price_uah = int(price_uah)
        property_obj.price_eur = int(price_eur)
        property_obj.price_usd_display = int(price_usd_rounded)

        conversions = {
            "USD": int(price_usd_rounded),
            "EUR": int(price_eur),
            "UAH": int(price_uah),
        }

        property_obj.display_currency_code = selected_currency
        property_obj.display_currency_symbol = currency_options[selected_currency][
            "symbol"
        ]
        property_obj.display_price = conversions[selected_currency]
        property_obj.other_currency_values = [
            {
                "code": code,
                "symbol": data["symbol"],
                "value": conversions[code],
            }
            for code, data in currency_options.items()
            if code != selected_currency
        ]

    return {"usd_rate": usd_rate, "eur_rate": eur_rate}

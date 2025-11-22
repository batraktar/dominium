import json
import logging
import os
from decimal import Decimal, InvalidOperation
from urllib.parse import urlparse

import requests
from django.conf import settings
from django.contrib.auth.decorators import user_passes_test
from django.core.cache import cache
from django.core.files.base import ContentFile
from django.core.paginator import EmptyPage, Paginator
from django.db import transaction
from django.db.models import Q
from django.http import HttpResponseNotAllowed, JsonResponse
from django.shortcuts import get_object_or_404
from django.utils.html import strip_tags
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from house.api.serializers import serialize_image, serialize_property
from house.models import (DealType, Feature, HomepageHighlightSettings,
                          Property, PropertyImage, PropertyType)
from house.utils.currency import get_exchange_rates
from house.utils.html_parser import parse_property_html
from landing_doominium_real_state.views.common import get_client_ip

logger = logging.getLogger(__name__)


def _parse_json(request):
    try:
        return json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None


def _get_decimal(value, field_name, errors):
    if value in (None, ""):
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError):
        errors[field_name] = "Повинно бути числове значення."
        return None


def _get_int(value, field_name, errors):
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        errors[field_name] = "Повинно бути ціле число."
        return None


def _get_bool(value):
    if isinstance(value, bool):
        return value
    if value in (None, ""):
        return None
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"1", "true", "yes", "on"}:
            return True
        if lowered in {"0", "false", "no", "off"}:
            return False
    return None


def _try_parse_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _properties_queryset():
    return Property.objects.select_related(
        "property_type", "deal_type"
    ).prefetch_related("features", "images")


def _create_property_from_parsed(data: dict):
    warnings: list[str] = []
    payload = {
        "title": data.get("title"),
        "address": data.get("address"),
        "description": strip_tags(data.get("description_html") or "")[:4000],
        "price": data.get("price"),
        "area": int(round(data.get("area") or 0)),
        "rooms": int(data.get("rooms") or 1),
        "latitude": data.get("latitude"),
        "longitude": data.get("longitude"),
    }

    validation_errors = {}
    if not payload["title"]:
        validation_errors["title"] = "Не вдалося визначити назву."
    if not payload["address"]:
        validation_errors["address"] = "Не вдалося визначити адресу."

    property_obj = Property()
    _update_fields(property_obj, payload, validation_errors)

    if validation_errors:
        return None, validation_errors, warnings

    property_type = _resolve_property_type_by_name(data.get("property_type"))
    deal_type = _resolve_deal_type_by_name(data.get("deal_type"))

    if property_type:
        property_obj.property_type = property_type
    if deal_type:
        property_obj.deal_type = deal_type

    try:
        property_obj.save()
    except Exception as exc:
        return None, {"save": str(exc)}, warnings

    warnings.extend(_import_images(property_obj, data))

    return property_obj, None, warnings


def _import_images(property_obj: Property, data: dict) -> list[str]:
    warnings: list[str] = []
    image_pairs: list[tuple[str, bool]] = []
    main_image = data.get("main_image")
    if main_image:
        image_pairs.append((main_image, True))
    for url in data.get("gallery") or []:
        image_pairs.append((url, False))

    seen = set()
    has_main = property_obj.images.filter(is_main=True).exists()
    timeout = getattr(settings, "REQUESTS_TIMEOUT", 10)

    for index, (url, wants_main) in enumerate(image_pairs, start=1):
        if not url or url in seen:
            continue
        seen.add(url)
        try:
            response = requests.get(url, timeout=timeout)
            response.raise_for_status()
        except requests.RequestException as exc:
            warnings.append(f"{url}: {exc}")
            continue

        filename = (
            os.path.basename(urlparse(url).path)
            or f"import-{property_obj.pk}-{index}.jpg"
        )
        if not os.path.splitext(filename)[1]:
            filename += ".jpg"

        try:
            content = ContentFile(response.content, name=filename)
            property_obj.images.create(
                image=content,
                is_main=wants_main and not has_main,
            )
            if wants_main and not has_main:
                has_main = True
        except Exception as exc:
            warnings.append(f"{url}: {exc}")

    return warnings


def _resolve_property_type_by_name(name: str | None):
    if not name:
        return None
    normalized = name.strip()
    if not normalized:
        return None
    obj = PropertyType.objects.filter(name__iexact=normalized).first()
    if obj:
        return obj
    return PropertyType.objects.create(name=normalized)


def _resolve_deal_type_by_name(name: str | None):
    if not name:
        return None
    normalized = name.strip()
    if not normalized:
        return None
    obj = DealType.objects.filter(name__iexact=normalized).first()
    if obj:
        return obj
    return DealType.objects.create(name=normalized)


def _apply_relation(instance, data, errors, *, update_features=False):
    property_type_id = data.get("property_type_id")
    deal_type_id = data.get("deal_type_id")
    feature_ids = data.get("feature_ids")

    if property_type_id is not None:
        try:
            instance.property_type = PropertyType.objects.get(id=property_type_id)
        except PropertyType.DoesNotExist:
            errors["property_type_id"] = "Вказаний тип нерухомості не існує."

    if deal_type_id is not None:
        try:
            instance.deal_type = DealType.objects.get(id=deal_type_id)
        except DealType.DoesNotExist:
            errors["deal_type_id"] = "Вказаний тип угоди не існує."

    if update_features and feature_ids is not None:
        features = list(Feature.objects.filter(id__in=feature_ids))
        missing = set(feature_ids) - {feature.id for feature in features}
        if missing:
            errors["feature_ids"] = (
                f"Відсутні ID характеристик: {', '.join(map(str, missing))}."
            )
        else:
            instance.features.set(features)


def _update_fields(instance, data, errors):
    if "title" in data:
        instance.title = data["title"].strip()
    if "description" in data:
        instance.description = data["description"].strip()
    if "address" in data:
        instance.address = data["address"].strip()

    price = _get_decimal(data.get("price"), "price", errors)
    if price is not None:
        instance.price = price

    area = _get_int(data.get("area"), "area", errors)
    if area is not None:
        instance.area = area

    rooms = _get_int(data.get("rooms"), "rooms", errors)
    if rooms is not None:
        instance.rooms = rooms

    if "latitude" in data:
        try:
            instance.latitude = (
                float(data["latitude"]) if data["latitude"] is not None else None
            )
        except (TypeError, ValueError):
            errors["latitude"] = "Повинно бути числове значення."

    if "longitude" in data:
        try:
            instance.longitude = (
                float(data["longitude"]) if data["longitude"] is not None else None
            )
        except (TypeError, ValueError):
            errors["longitude"] = "Повинно бути числове значення."
    if "featured_homepage" in data:
        raw_value = data.get("featured_homepage")
        parsed = _get_bool(raw_value)
        if parsed is None and raw_value not in (None, ""):
            errors["featured_homepage"] = "Повинно бути булеве значення."
        elif parsed is not None:
            instance.featured_homepage = parsed
    if "is_archived" in data:
        parsed = _get_bool(data.get("is_archived"))
        if parsed is None and data.get("is_archived") not in (None, ""):
            errors["is_archived"] = "Повинно бути булеве значення."
        elif parsed is not None:
            instance.is_archived = parsed


@csrf_exempt
@require_http_methods(["GET", "POST"])
def property_collection(request):
    if request.method == "GET":
        queryset = _properties_queryset()

        explicit_archived = request.GET.get("is_archived")
        status_filter = (request.GET.get("status") or "active").strip().lower()
        if explicit_archived not in (None, ""):
            archived_bool = _get_bool(explicit_archived)
            if archived_bool is True:
                queryset = queryset.filter(is_archived=True)
                status_filter = "archived"
            elif archived_bool is False:
                queryset = queryset.filter(is_archived=False)
                status_filter = "active"
            else:
                status_filter = "all"
        else:
            if status_filter == "archived":
                queryset = queryset.filter(is_archived=True)
            elif status_filter == "all":
                pass
            else:
                status_filter = "active"
                queryset = queryset.filter(is_archived=False)

        deal_type = request.GET.get("deal_type")
        if deal_type:
            if str(deal_type).isdigit():
                queryset = queryset.filter(deal_type_id=int(deal_type))
            else:
                queryset = queryset.filter(deal_type__name__iexact=deal_type.strip())

        property_type_filters = [
            value.strip()
            for value in request.GET.getlist("property_type")
            if value.strip()
        ]
        if property_type_filters:
            slug_filters = []
            id_filters = []
            for value in property_type_filters:
                if value.isdigit():
                    id_filters.append(int(value))
                else:
                    slug_filters.append(value)
            if id_filters and slug_filters:
                queryset = queryset.filter(
                    Q(property_type_id__in=id_filters)
                    | Q(property_type__slug__in=slug_filters)
                )
            elif id_filters:
                queryset = queryset.filter(property_type_id__in=id_filters)
            elif slug_filters:
                queryset = queryset.filter(property_type__slug__in=slug_filters)

        search_query = request.GET.get("q")
        if search_query:
            queryset = queryset.filter(title__icontains=search_query.strip())

        area_min = _try_parse_int(request.GET.get("area_min"))
        area_max = _try_parse_int(request.GET.get("area_max"))
        if area_min is not None:
            queryset = queryset.filter(area__gte=area_min)
        if area_max is not None:
            queryset = queryset.filter(area__lte=area_max)

        min_price = request.GET.get("price_min")
        max_price = request.GET.get("price_max")
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)

        rooms_min = _try_parse_int(request.GET.get("rooms_min"))
        rooms_max = _try_parse_int(request.GET.get("rooms_max"))
        if rooms_min is not None:
            queryset = queryset.filter(rooms__gte=rooms_min)
        if rooms_max is not None:
            queryset = queryset.filter(rooms__lte=rooms_max)

        rooms_param = (request.GET.get("rooms") or "").strip()
        if rooms_param:
            room_tokens = [
                token.strip() for token in rooms_param.split(",") if token.strip()
            ]
            exact_rooms = [int(token) for token in room_tokens if token.isdigit()]
            needs_5plus = any(token == "5+" for token in room_tokens)
            room_filter = Q()
            if exact_rooms:
                room_filter |= Q(rooms__in=exact_rooms)
            if needs_5plus:
                room_filter |= Q(rooms__gte=5)
            if room_filter.children:
                queryset = queryset.filter(room_filter)

        featured = request.GET.get("featured")
        if featured not in (None, ""):
            featured_bool = _get_bool(featured)
            if featured_bool is True:
                queryset = queryset.filter(featured_homepage=True)
            elif featured_bool is False:
                queryset = queryset.filter(featured_homepage=False)

        ordering = request.GET.get("ordering", "-created_at")
        allowed_ordering = {
            "created_at",
            "-created_at",
            "price",
            "-price",
            "title",
            "-title",
        }
        if ordering not in allowed_ordering:
            ordering = "-created_at"
        queryset = queryset.order_by(ordering)

        try:
            page_number = int(request.GET.get("page", 1))
        except (TypeError, ValueError):
            page_number = 1
        raw_page_size = request.GET.get("page_size")
        if raw_page_size is None:
            raw_page_size = request.GET.get("per_page")
        try:
            page_size = int(raw_page_size or 10)
        except (TypeError, ValueError):
            page_size = 10
        page_size = min(max(page_size, 1), 100)

        paginator = Paginator(queryset, page_size)
        try:
            page_obj = paginator.page(page_number)
        except EmptyPage:
            page_obj = paginator.page(paginator.num_pages or 1)

        data = [serialize_property(property_obj, request) for property_obj in page_obj]
        payload = {
            "results": data,
            "count": paginator.count,
            "total_pages": paginator.num_pages,
            "page": page_obj.number,
            "page_size": page_obj.paginator.per_page,
            "ordering": ordering,
            "status": status_filter,
        }
        return JsonResponse(payload, status=200)

    payload = _parse_json(request)
    if payload is None:
        return JsonResponse({"error": "Некоректний JSON."}, status=400)

    errors = {}
    required_fields = ("title", "address", "price", "area", "rooms")
    missing = [field for field in required_fields if not payload.get(field)]
    if missing:
        return JsonResponse(
            {"error": f"Відсутні обов'язкові поля: {', '.join(missing)}."}, status=400
        )

    with transaction.atomic():
        property_obj = Property()
        _update_fields(property_obj, payload, errors)
        _apply_relation(property_obj, payload, errors, update_features=False)

        if errors:
            transaction.set_rollback(True)
            return JsonResponse({"errors": errors}, status=400)

        property_obj.save()

        if payload.get("feature_ids") is not None:
            _apply_relation(
                property_obj,
                {"feature_ids": payload["feature_ids"]},
                errors,
                update_features=True,
            )
            if errors:
                transaction.set_rollback(True)
                return JsonResponse({"errors": errors}, status=400)

    property_obj.refresh_from_db()
    property_obj = (
        Property.objects.select_related("property_type", "deal_type")
        .prefetch_related("features", "images")
        .get(pk=property_obj.pk)
    )
    return JsonResponse(serialize_property(property_obj, request), status=201)


@csrf_exempt
def property_item(request, property_id):
    try:
        property_obj = _properties_queryset().get(pk=property_id)
    except Property.DoesNotExist:
        return JsonResponse({"error": "Об'єкт не знайдено."}, status=404)

    if request.method == "GET":
        return JsonResponse(serialize_property(property_obj, request), status=200)

    if request.method in {"PATCH", "PUT"}:
        payload = _parse_json(request)
        if payload is None:
            return JsonResponse({"error": "Некоректний JSON."}, status=400)

        errors = {}
        with transaction.atomic():
            _update_fields(property_obj, payload, errors)
            _apply_relation(property_obj, payload, errors, update_features=True)

            if errors:
                transaction.set_rollback(True)
                return JsonResponse({"errors": errors}, status=400)

            property_obj.save()

        property_obj.refresh_from_db()
        property_obj = _properties_queryset().get(pk=property_obj.pk)
        return JsonResponse(serialize_property(property_obj, request), status=200)

    if request.method == "DELETE":
        property_obj.delete()
        return JsonResponse({"status": "deleted"}, status=200)

    return HttpResponseNotAllowed(["GET", "PATCH", "PUT", "DELETE"])


@require_http_methods(["GET"])
def property_type_collection(request):
    items = PropertyType.objects.all().order_by("name")
    data = [{"id": item.id, "name": item.name, "slug": item.slug} for item in items]
    return JsonResponse({"results": data, "count": len(data)}, status=200)


@require_http_methods(["GET"])
def deal_type_collection(request):
    items = DealType.objects.all().order_by("name")
    data = [{"id": item.id, "name": item.name} for item in items]
    return JsonResponse({"results": data, "count": len(data)}, status=200)


@require_http_methods(["GET"])
def feature_collection(request):
    items = Feature.objects.all().order_by("name")
    data = [{"id": item.id, "name": item.name} for item in items]
    return JsonResponse({"results": data, "count": len(data)}, status=200)


def _serialize_highlight_settings(settings_obj):
    if settings_obj is None:
        return {
            "id": None,
            "limit": 3,
            "price_min": None,
            "price_max": None,
            "region_keyword": "",
            "property_type_ids": [],
        }

    return {
        "id": settings_obj.id,
        "limit": settings_obj.limit,
        "price_min": (
            float(settings_obj.price_min)
            if settings_obj.price_min is not None
            else None
        ),
        "price_max": (
            float(settings_obj.price_max)
            if settings_obj.price_max is not None
            else None
        ),
        "region_keyword": settings_obj.region_keyword,
        "property_type_ids": list(
            settings_obj.property_types.values_list("id", flat=True)
        ),
    }


@csrf_exempt
@require_http_methods(["GET", "PATCH", "POST"])
def highlight_settings_view(request):
    settings_obj = HomepageHighlightSettings.objects.first()

    if request.method == "GET":
        return JsonResponse(
            {"result": _serialize_highlight_settings(settings_obj)}, status=200
        )

    payload = _parse_json(request)
    if payload is None:
        return JsonResponse({"error": "Некоректний JSON."}, status=400)

    created = False
    if settings_obj is None:
        settings_obj = HomepageHighlightSettings.objects.create()
        created = True

    errors = {}
    if "limit" in payload:
        limit = _get_int(payload.get("limit"), "limit", errors)
        if limit is not None:
            if limit <= 0:
                errors["limit"] = "Значення повинно бути більше 0."
            else:
                settings_obj.limit = limit

    if "price_min" in payload:
        price_min = _get_decimal(payload.get("price_min"), "price_min", errors)
        if price_min is not None or payload.get("price_min") in ("", None):
            settings_obj.price_min = price_min

    if "price_max" in payload:
        price_max = _get_decimal(payload.get("price_max"), "price_max", errors)
        if price_max is not None or payload.get("price_max") in ("", None):
            settings_obj.price_max = price_max

    if "region_keyword" in payload:
        settings_obj.region_keyword = (payload.get("region_keyword") or "").strip()

    property_type_ids = payload.get("property_type_ids")
    property_types_to_set = None
    if property_type_ids is not None:
        try:
            property_type_ids = [int(pk) for pk in property_type_ids]
        except (TypeError, ValueError):
            errors["property_type_ids"] = "Список має містити ідентифікатори."
        else:
            property_types = list(PropertyType.objects.filter(id__in=property_type_ids))
            missing = set(property_type_ids) - {item.id for item in property_types}
            if missing:
                errors["property_type_ids"] = (
                    f"Типи з ID {', '.join(map(str, missing))} не знайдено."
                )
            else:
                property_types_to_set = property_types

    if errors:
        if created:
            settings_obj.delete()
        return JsonResponse({"errors": errors}, status=400)

    settings_obj.save()

    if property_types_to_set is not None:
        settings_obj.property_types.set(property_types_to_set)

    settings_obj.refresh_from_db()
    status_code = 201 if created else 200
    return JsonResponse(
        {"result": _serialize_highlight_settings(settings_obj)}, status=status_code
    )


def _import_rate_limited(request):
    """Simple per-user/IP throttle to protect heavy import endpoints."""
    limit = getattr(settings, "IMPORT_RATE_LIMIT", 5)
    window = getattr(settings, "IMPORT_RATE_WINDOW", 60)
    identifier = request.user.id if request.user.is_authenticated else "anon"
    key = f"import-rate:{identifier}:{get_client_ip(request) or 'ip-unknown'}"
    current = cache.get(key, 0)
    if current >= limit:
        return True
    try:
        cache.incr(key)
    except ValueError:
        cache.set(key, 1, timeout=window)
    return False


def _ensure_staff(request):
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({"error": "forbidden"}, status=403)
    if _import_rate_limited(request):
        return JsonResponse(
            {"error": "Too many import requests. Try again later."}, status=429
        )
    return None


@csrf_exempt
@require_http_methods(["POST"])
def property_import(request):
    guard_response = _ensure_staff(request)
    if guard_response:
        return guard_response

    payload = _parse_json(request)
    if payload is None:
        return JsonResponse({"error": "Некоректний JSON."}, status=400)

    chunk = (
        payload
        if isinstance(payload, list)
        else payload.get("items") or payload.get("properties")
    )
    if not isinstance(chunk, list):
        return JsonResponse(
            {"error": "Очікується список об'єктів у полі 'items'."}, status=400
        )

    created = []
    errors = []

    for idx, item in enumerate(chunk, start=1):
        if not isinstance(item, dict):
            errors.append({"index": idx, "error": "Елемент має бути JSON-об'єктом."})
            continue

        validation_errors = {}
        property_obj = Property()
        _update_fields(property_obj, item, validation_errors)
        _apply_relation(property_obj, item, validation_errors, update_features=False)

        if validation_errors:
            errors.append({"index": idx, "errors": validation_errors})
            continue

        property_obj.save()

        feature_ids = item.get("feature_ids")
        if isinstance(feature_ids, list):
            _apply_relation(
                property_obj,
                {"feature_ids": feature_ids},
                validation_errors,
                update_features=True,
            )

        created.append(property_obj.id)

    status_code = 201 if created and not errors else 207
    return JsonResponse({"created": created, "errors": errors}, status=status_code)


@csrf_exempt
@require_http_methods(["POST"])
def property_import_html(request):
    guard_response = _ensure_staff(request)
    if guard_response:
        return guard_response

    files = request.FILES.getlist("files")
    if not files:
        return JsonResponse({"error": "Не передано файлів для імпорту."}, status=400)

    geocode = request.POST.get("geocode") in {"1", "true", "on"}
    rates = get_exchange_rates()
    created = []
    errors = []

    for uploaded in files:
        name = getattr(uploaded, "name", "unnamed.html")
        try:
            content = uploaded.read().decode("utf-8")
        except UnicodeDecodeError:
            errors.append(
                {"file": name, "error": "Не вдалося прочитати файл у кодуванні UTF-8."}
            )
            continue

        try:
            parsed = parse_property_html(
                content,
                source=name,
                rates=rates,
                geocode_missing=geocode,
            )
            data = parsed.as_dict()
        except Exception as exc:
            logger.exception("Помилка парсингу файлу %s: %s", name, exc)
            errors.append({"file": name, "error": f"Не вдалося розібрати HTML: {exc}"})
            continue

        property_obj, validation_errors, warnings = _create_property_from_parsed(data)
        if validation_errors:
            errors.append({"file": name, "errors": validation_errors})
            continue

        created.append(
            {"id": property_obj.id, "title": property_obj.title, "warnings": warnings}
        )

    status_code = 201 if created and not errors else 207
    return JsonResponse({"created": created, "errors": errors}, status=status_code)


@csrf_exempt
@require_http_methods(["POST"])
def property_import_link(request):
    guard_response = _ensure_staff(request)
    if guard_response:
        return guard_response

    payload = _parse_json(request)
    if payload is None:
        return JsonResponse({"error": "Некоректний JSON."}, status=400)

    url = (payload.get("url") or "").strip()
    if not url:
        return JsonResponse({"error": "Поле 'url' обов'язкове."}, status=400)

    geocode = bool(payload.get("geocode"))

    try:
        response = requests.get(url, timeout=getattr(settings, "REQUESTS_TIMEOUT", 10))
        response.raise_for_status()
    except requests.RequestException as exc:
        return JsonResponse(
            {"error": f"Не вдалося завантажити HTML: {exc}"}, status=400
        )

    try:
        parsed = parse_property_html(
            response.text,
            source=url,
            rates=get_exchange_rates(),
            geocode_missing=geocode,
        )
    except Exception as exc:
        logger.exception("Помилка парсингу URL %s: %s", url, exc)
        return JsonResponse({"error": f"Не вдалося розібрати HTML: {exc}"}, status=400)

    property_obj, validation_errors, warnings = _create_property_from_parsed(
        parsed.as_dict()
    )
    if validation_errors:
        return JsonResponse({"errors": validation_errors}, status=400)

    return JsonResponse(
        {
            "created": {
                "id": property_obj.id,
                "title": property_obj.title,
                "warnings": warnings,
            }
        },
        status=201,
    )


def _is_staff(user):
    return user.is_authenticated and user.is_staff


def serialize_image(image_obj, request=None):
    return {
        "id": image_obj.id,
        "url": _absolute_url(request, image_obj.image.url),
        "is_main": image_obj.is_main,
    }


@csrf_exempt
@require_http_methods(["POST"])
@user_passes_test(_is_staff)
def property_bulk_action(request):
    payload = _parse_json(request)
    if payload is None:
        return JsonResponse(
            {"status": "error", "message": "Некоректний JSON."}, status=400
        )

    ids = payload.get("ids") or []
    action = (payload.get("action") or "").strip().lower()

    if not isinstance(ids, list) or not ids:
        return JsonResponse(
            {"status": "error", "message": "Не вибрано жодного об'єкта."}, status=400
        )

    valid_actions = {"archive", "restore", "delete"}
    if action not in valid_actions:
        return JsonResponse(
            {"status": "error", "message": "Непідтримувана дія."}, status=400
        )

    queryset = Property.objects.filter(id__in=ids)
    affected = queryset.count()

    if affected == 0:
        return JsonResponse(
            {"status": "error", "message": "Обрані об'єкти не існують."}, status=404
        )

    if action == "archive":
        queryset.update(is_archived=True)
    elif action == "restore":
        queryset.update(is_archived=False)
    else:
        queryset.delete()

    return JsonResponse(
        {"status": "ok", "processed": affected, "action": action}, status=200
    )


@csrf_exempt
@require_http_methods(["GET", "POST"])
@user_passes_test(_is_staff)
def property_image_list(request, property_id):
    property_obj = get_object_or_404(Property, pk=property_id)

    if request.method == "GET":
        images = property_obj.images.all().order_by("sort_order", "-is_main", "-id")
        data = [serialize_image(image, request) for image in images]
        return JsonResponse({"results": data, "count": len(data)}, status=200)

    images = request.FILES.getlist("images")
    if not images:
        single = request.FILES.get("image")
        if single:
            images = [single]

    if not images:
        return JsonResponse(
            {"error": "Потрібно надіслати хоча б одне фото."}, status=400
        )

    created = []
    errors = []
    for index, upload in enumerate(images, start=1):
        is_main = bool(request.POST.get("is_main")) and index == len(images)
        image_obj = PropertyImage(property=property_obj, image=upload, is_main=is_main)
        try:
            image_obj.save()
            created.append(serialize_image(image_obj, request))
        except Exception as exc:
            errors.append({"file": getattr(upload, "name", "файл"), "error": str(exc)})

    status_code = 201 if created else 400
    return JsonResponse({"created": created, "errors": errors}, status=status_code)


@csrf_exempt
@require_http_methods(["PATCH", "DELETE"])
@user_passes_test(_is_staff)
def property_image_detail(request, image_id):
    image_obj = get_object_or_404(PropertyImage, pk=image_id)

    if request.method == "PATCH":
        payload = _parse_json(request)
        if payload is None:
            return JsonResponse({"error": "Некоректний JSON."}, status=400)
        is_main_flag = _get_bool(payload.get("is_main"))
        if is_main_flag is True:
            image_obj.is_main = True
        elif is_main_flag is False:
            image_obj.is_main = False
        image_obj.save()
        return JsonResponse({"result": serialize_image(image_obj, request)}, status=200)

    # DELETE
    image_obj.image.delete(save=False)
    image_obj.delete()
    return JsonResponse({"status": "deleted"}, status=200)


@csrf_exempt
@require_http_methods(["POST"])
@user_passes_test(_is_staff)
def property_images_reorder(request, property_id):
    property_obj = get_object_or_404(Property, pk=property_id)
    payload = _parse_json(request)
    if payload is None:
        return JsonResponse({"error": "Некоректний JSON."}, status=400)
    order = payload.get("order") or []
    if not isinstance(order, list):
        return JsonResponse({"error": "Очікується список id."}, status=400)
    images = list(property_obj.images.all().filter(id__in=order).select_related())
    id_map = {image.id: image for image in images}
    for idx, image_id in enumerate(order, start=1):
        image = id_map.get(image_id)
        if image:
            image.sort_order = idx
            image.save()
    return JsonResponse({"status": "ok"}, status=200)

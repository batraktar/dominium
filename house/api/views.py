import json
import logging
import os
from decimal import Decimal, InvalidOperation

import requests
from django.conf import settings
from django.core.cache import cache
from django.core.paginator import EmptyPage, Paginator
from django.db.models import Q
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods
from PIL import Image, UnidentifiedImageError
from rest_framework import status, viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import AllowAny, SAFE_METHODS
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework_simplejwt.authentication import JWTAuthentication

from accounts.models import Favorite
from house.api.drf_serializers import (
    HighlightSettingsWriteSerializer,
    PropertyWriteSerializer,
)
from house.api.permissions import IsStaffWriteOrReadOnly
from house.api.serializers import serialize_property, _absolute_url
from house.models import (
    DealType,
    Feature,
    HomepageHighlightSettings,
    Property,
    PropertyImage,
    PropertyType,
)
from house.services.search import SORT_MAP as SEARCH_SORT_MAP
from house.services.search import apply_text_query_filter
from house.services.importer import (
    InvalidImportURL,
    PropertyImportError,
    import_images_from_parsed,
    import_property_from_url,
)
from house.utils.network_security import (
    ImportContentTypeError,
    ImportPayloadTooLargeError,
    UnsafeImportURLError,
    decode_html_payload,
)
from house.utils.sanitization import sanitize_rich_text
from house.utils.currency import get_exchange_rates
from house.utils.html_parser import parse_property_html
from dominium_backend.seo_regions import collect_city_keywords, collect_region_keywords
from dominium_backend.views.common import get_client_ip

logger = logging.getLogger(__name__)


@require_http_methods(["POST"])
def crm_sync_view(request):
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({"error": "forbidden"}, status=403)

    from django.core.management import call_command
    from io import StringIO

    out = StringIO()
    try:
        call_command("sync_crm_properties", stdout=out, stderr=out)
    except Exception as exc:
        logger.exception("CRM sync failed")
        return JsonResponse({"error": f"Sync failed: {exc}"}, status=500)

    output = out.getvalue()
    return JsonResponse({"status": "ok", "output": output}, status=200)


def _parse_json(request):
    try:
        return json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None


@ensure_csrf_cookie
@require_http_methods(["GET"])
def csrf_token_view(request):
    return JsonResponse({"csrfToken": get_token(request)})


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


def _apply_keyword_scope_filter(queryset, keywords: list[str]):
    if not keywords:
        return queryset.none()

    keyword_filter = Q()
    for keyword in keywords:
        normalized = str(keyword or "").strip()
        if not normalized:
            continue
        keyword_filter |= Q(address__icontains=normalized) | Q(title__icontains=normalized)

    if not keyword_filter.children:
        return queryset.none()
    return queryset.filter(keyword_filter)


def _create_property_from_parsed(data: dict):
    warnings: list[str] = []
    payload = {
        "title": data.get("title"),
        "address": data.get("address"),
        "description": sanitize_rich_text(data.get("description_html") or ""),
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

    warnings.extend(
        import_images_from_parsed(
            property_obj,
            data,
            timeout=getattr(settings, "REQUESTS_TIMEOUT", 10),
        )
    )

    return property_obj, None, warnings


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
        instance.description = sanitize_rich_text(data["description"])
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
        else:
            if instance.latitude is not None and not (-90 <= instance.latitude <= 90):
                errors["latitude"] = "Широта повинна бути в межах від -90 до 90."

    if "longitude" in data:
        try:
            instance.longitude = (
                float(data["longitude"]) if data["longitude"] is not None else None
            )
        except (TypeError, ValueError):
            errors["longitude"] = "Повинно бути числове значення."
        else:
            if instance.longitude is not None and not (-180 <= instance.longitude <= 180):
                errors["longitude"] = "Довгота повинна бути в межах від -180 до 180."
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


class SecurePropertyViewSet(viewsets.ModelViewSet):
    """
    Hardened Property API:
    - Public: read-only (GET).
    - Unsafe methods: staff or explicit model permissions only.
    - Explicit auth + throttling at the endpoint level.
    """

    authentication_classes = [SessionAuthentication, JWTAuthentication]
    permission_classes = [IsStaffWriteOrReadOnly]
    throttle_classes = [AnonRateThrottle, UserRateThrottle]
    serializer_class = PropertyWriteSerializer
    permission_model = Property
    lookup_url_kwarg = "property_id"

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [AllowAny()]
        return [permission() for permission in self.permission_classes]

    def get_queryset(self):
        return _properties_queryset()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        query_params = request.query_params

        explicit_archived = query_params.get("is_archived")
        status_filter = (query_params.get("status") or "active").strip().lower()
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

        deal_type = query_params.get("deal_type")
        if deal_type:
            if str(deal_type).isdigit():
                queryset = queryset.filter(deal_type_id=int(deal_type))
            else:
                queryset = queryset.filter(deal_type__name__iexact=deal_type.strip())

        property_type_filters = [
            value.strip()
            for value in query_params.getlist("property_type")
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

        city_slug = (query_params.get("city_slug") or "").strip().lower()
        region_slug = (query_params.get("region_slug") or "").strip().lower()
        if city_slug:
            queryset = _apply_keyword_scope_filter(queryset, collect_city_keywords(city_slug))
        elif region_slug:
            queryset = _apply_keyword_scope_filter(queryset, collect_region_keywords(region_slug))

        queryset = apply_text_query_filter(queryset, query_params.get("q"))

        area_min = _try_parse_int(query_params.get("area_min"))
        area_max = _try_parse_int(query_params.get("area_max"))
        if area_min is not None:
            queryset = queryset.filter(area__gte=area_min)
        if area_max is not None:
            queryset = queryset.filter(area__lte=area_max)

        price_errors = {}
        min_price = _get_decimal(query_params.get("price_min"), "price_min", price_errors)
        max_price = _get_decimal(query_params.get("price_max"), "price_max", price_errors)
        if min_price is not None:
            queryset = queryset.filter(price__gte=min_price)
        if max_price is not None:
            queryset = queryset.filter(price__lte=max_price)

        rooms_min = _try_parse_int(query_params.get("rooms_min"))
        rooms_max = _try_parse_int(query_params.get("rooms_max"))
        rooms_filtered = False
        if rooms_min is not None:
            queryset = queryset.filter(rooms__gte=rooms_min)
            rooms_filtered = True
        if rooms_max is not None:
            if rooms_max < 6:
                queryset = queryset.filter(rooms__lte=rooms_max)
            rooms_filtered = True

        rooms_param = (query_params.get("rooms") or "").strip()
        if rooms_param and not rooms_filtered:
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

        featured = query_params.get("featured")
        if featured not in (None, ""):
            featured_bool = _get_bool(featured)
            if featured_bool is True:
                queryset = queryset.filter(featured_homepage=True)
            elif featured_bool is False:
                queryset = queryset.filter(featured_homepage=False)

        sort_key = (query_params.get("sort") or "").strip()
        mapped_ordering = SEARCH_SORT_MAP.get(sort_key)
        ordering = mapped_ordering or query_params.get("ordering", "-created_at")
        allowed_ordering = {
            "created_at",
            "-created_at",
            "price",
            "-price",
            "area",
            "-area",
            "title",
            "-title",
        }
        if ordering not in allowed_ordering:
            ordering = "-created_at"
        queryset = queryset.order_by(ordering)

        try:
            page_number = int(query_params.get("page", 1))
        except (TypeError, ValueError):
            page_number = 1
        raw_page_size = query_params.get("page_size")
        if raw_page_size is None:
            raw_page_size = query_params.get("per_page")
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
        return Response(
            {
                "results": data,
                "count": paginator.count,
                "total_pages": paginator.num_pages,
                "page": page_obj.number,
                "page_size": page_obj.paginator.per_page,
                "ordering": ordering,
                "status": status_filter,
            },
            status=status.HTTP_200_OK,
        )

    def retrieve(self, request, *args, **kwargs):
        property_obj = self.get_object()
        return Response(
            serialize_property(property_obj, request),
            status=status.HTTP_200_OK,
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        property_obj = serializer.save()
        property_obj = self.get_queryset().get(pk=property_obj.pk)
        return Response(
            serialize_property(property_obj, request),
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        property_obj = self.get_object()
        serializer = self.get_serializer(property_obj, data=request.data, partial=False)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        updated = serializer.save()
        updated = self.get_queryset().get(pk=updated.pk)
        return Response(
            serialize_property(updated, request),
            status=status.HTTP_200_OK,
        )

    def partial_update(self, request, *args, **kwargs):
        property_obj = self.get_object()
        serializer = self.get_serializer(property_obj, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        updated = serializer.save()
        updated = self.get_queryset().get(pk=updated.pk)
        return Response(
            serialize_property(updated, request),
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        property_obj = self.get_object()
        property_obj.delete()
        return Response({"status": "deleted"}, status=status.HTTP_200_OK)


property_collection = SecurePropertyViewSet.as_view(
    {"get": "list", "post": "create"}
)
property_item = SecurePropertyViewSet.as_view(
    {"get": "retrieve", "patch": "partial_update", "put": "update", "delete": "destroy"}
)


@require_http_methods(["GET"])
def property_by_slug(request, slug):
    property_obj = get_object_or_404(_properties_queryset(), slug=slug)
    return JsonResponse({"result": serialize_property(property_obj, request)}, status=200)


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


@require_http_methods(["GET"])
def liked_properties_collection(request):
    if not request.user.is_authenticated:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."},
            status=401,
        )

    favorites = (
        Favorite.objects.filter(user=request.user)
        .select_related(
            "property__deal_type",
            "property__property_type",
        )
        .prefetch_related("property__images")
    )
    properties = [favorite.property for favorite in favorites]
    for property_obj in properties:
        property_obj.absolute_url = request.build_absolute_uri(
            property_obj.get_absolute_url()
        )

    ids_only = (request.GET.get("ids") or "").lower() in {"1", "true", "yes"}
    if ids_only:
        data = [property_obj.id for property_obj in properties]
        return JsonResponse({"results": data, "count": len(data)}, status=200)

    data = [serialize_property(property_obj, request) for property_obj in properties]
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


class SecureHighlightSettingsViewSet(viewsets.ViewSet):
    authentication_classes = [SessionAuthentication, JWTAuthentication]
    permission_classes = [IsStaffWriteOrReadOnly]
    throttle_classes = [AnonRateThrottle, UserRateThrottle]
    permission_model = HomepageHighlightSettings

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [AllowAny()]
        return [permission() for permission in self.permission_classes]

    def list(self, request):
        settings_obj = HomepageHighlightSettings.objects.prefetch_related(
            "property_types"
        ).first()
        return Response(
            {"result": _serialize_highlight_settings(settings_obj)},
            status=status.HTTP_200_OK,
        )

    def create(self, request):
        return self._upsert(request)

    def partial_update(self, request):
        return self._upsert(request)

    def _upsert(self, request):
        existing = HomepageHighlightSettings.objects.prefetch_related("property_types").first()
        created = existing is None

        serializer = HighlightSettingsWriteSerializer(
            existing,
            data=request.data,
            partial=True,
        )
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        settings_obj = serializer.save()
        settings_obj.refresh_from_db()
        return Response(
            {"result": _serialize_highlight_settings(settings_obj)},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


highlight_settings_view = SecureHighlightSettingsViewSet.as_view(
    {"get": "list", "post": "create", "patch": "partial_update"}
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


def _parse_geocode_flag(raw_value):
    parsed = _get_bool(raw_value)
    if parsed is None and raw_value not in (None, ""):
        raise ValueError("Поле 'geocode' має бути булевим значенням.")
    return bool(parsed)


def _read_uploaded_bytes_with_limit(uploaded_file) -> bytes:
    limit = int(getattr(settings, "IMPORT_MAX_HTML_BYTES", 2 * 1024 * 1024))
    chunks: list[bytes] = []
    total = 0
    for chunk in uploaded_file.chunks():
        total += len(chunk)
        if total > limit:
            raise ImportPayloadTooLargeError(
                f"Файл перевищує ліміт {limit} байт і не може бути імпортований."
            )
        chunks.append(chunk)
    return b"".join(chunks)


def _ensure_staff_only(request):
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({"error": "forbidden"}, status=403)
    return None


def _ensure_staff(request):
    guard = _ensure_staff_only(request)
    if guard:
        return guard
    if _import_rate_limited(request):
        return JsonResponse(
            {"error": "Too many import requests. Try again later."}, status=429
        )
    return None


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


@require_http_methods(["POST"])
def property_import_html(request):
    guard_response = _ensure_staff(request)
    if guard_response:
        return guard_response

    files = request.FILES.getlist("files")
    if not files:
        return JsonResponse({"error": "Не передано файлів для імпорту."}, status=400)

    try:
        geocode = _parse_geocode_flag(request.POST.get("geocode"))
    except ValueError as exc:
        return JsonResponse({"error": str(exc)}, status=400)

    rates = get_exchange_rates()
    created = []
    errors = []

    for uploaded in files:
        name = getattr(uploaded, "name", "unnamed.html")
        try:
            raw_html = _read_uploaded_bytes_with_limit(uploaded)
            content = decode_html_payload(raw_html)
        except ImportPayloadTooLargeError as exc:
            errors.append({"file": name, "error": str(exc)})
            continue
        except Exception:
            errors.append(
                {"file": name, "error": "Не вдалося прочитати файл імпорту."}
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

    try:
        geocode = _parse_geocode_flag(payload.get("geocode"))
    except ValueError as exc:
        return JsonResponse({"error": str(exc)}, status=400)

    try:
        property_obj, warnings = import_property_from_url(
            url,
            timeout=getattr(settings, "REQUESTS_TIMEOUT", 10),
            geocode_missing=geocode,
        )
    except InvalidImportURL as exc:
        return JsonResponse({"error": str(exc)}, status=400)
    except (
        UnsafeImportURLError,
        ImportPayloadTooLargeError,
        ImportContentTypeError,
    ) as exc:
        return JsonResponse({"error": str(exc)}, status=400)
    except requests.RequestException as exc:
        return JsonResponse(
            {"error": f"Не вдалося завантажити HTML: {exc}"}, status=400
        )
    except PropertyImportError as exc:
        return JsonResponse({"error": str(exc)}, status=422)
    except Exception as exc:
        logger.exception("Помилка імпорту URL %s: %s", url, exc)
        return JsonResponse({"error": f"Внутрішня помилка імпорту: {exc}"}, status=500)

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


def _validate_admin_image_upload(upload):
    filename = str(getattr(upload, "name", "") or "")
    extension = os.path.splitext(filename.lower())[1]
    if extension in {".svg", ".svgz"}:
        return "SVG-зображення не підтримуються."
    if extension and extension not in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff"}:
        return "Непідтримуваний формат зображення."

    content_type = str(getattr(upload, "content_type", "") or "").lower()
    if content_type == "image/svg+xml":
        return "SVG-зображення не підтримуються."
    if content_type and not content_type.startswith("image/"):
        return "Файл має бути зображенням."

    max_bytes = max(1, int(getattr(settings, "ADMIN_IMAGE_MAX_BYTES", 8 * 1024 * 1024) or (8 * 1024 * 1024)))
    size = getattr(upload, "size", None)
    if isinstance(size, int) and size > max_bytes:
        return f"Файл перевищує ліміт {max_bytes} байт."

    # MIME/extension can be spoofed, so verify image signature/payload.
    try:
        if hasattr(upload, "seek"):
            upload.seek(0)
        with Image.open(upload) as image:
            image.verify()
    except (UnidentifiedImageError, OSError, ValueError):
        return "Файл пошкоджений або не є валідним зображенням."
    finally:
        if hasattr(upload, "seek"):
            upload.seek(0)

    return None


def serialize_image(image_obj, request=None):
    return {
        "id": image_obj.id,
        "url": _absolute_url(request, image_obj.image.url),
        "is_main": image_obj.is_main,
    }


@require_http_methods(["POST"])
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


@require_http_methods(["GET", "POST"])
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

    max_files = max(1, int(getattr(settings, "ADMIN_IMAGE_UPLOAD_MAX_FILES", 20) or 20))
    if len(images) > max_files:
        return JsonResponse(
            {"error": f"За один запит можна завантажити не більше {max_files} фото."},
            status=400,
        )

    created = []
    errors = []
    for index, upload in enumerate(images, start=1):
        validation_error = _validate_admin_image_upload(upload)
        if validation_error:
            errors.append({"file": getattr(upload, "name", "файл"), "error": validation_error})
            continue

        is_main = bool(request.POST.get("is_main")) and index == len(images)
        image_obj = PropertyImage(property=property_obj, image=upload, is_main=is_main)
        try:
            image_obj.save()
            created.append(serialize_image(image_obj, request))
        except Exception as exc:
            errors.append({"file": getattr(upload, "name", "файл"), "error": str(exc)})

    status_code = 201 if created else 400
    return JsonResponse({"created": created, "errors": errors}, status=status_code)


@require_http_methods(["PATCH", "DELETE"])
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


@require_http_methods(["POST"])
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


@require_http_methods(["GET", "POST"])
def app_settings_view(request):
    from house.models import AppSettings

    if request.method == "GET":
        keys = ["crm", "telegram"]
        result = {}
        for key in keys:
            result[key] = AppSettings.get(key, {})
        return JsonResponse({"result": result})

    payload = _parse_json(request)
    if payload is None:
        return JsonResponse({"error": "Некоректний JSON."}, status=400)

    key = payload.get("key")
    value = payload.get("value")
    if not key or value is None:
        return JsonResponse({"error": "Поля 'key' та 'value' обов'язкові."}, status=400)

    AppSettings.set(key, value)
    return JsonResponse({"status": "ok", "key": key, "value": value})


@require_http_methods(["GET", "POST"])
def telegram_templates_view(request):
    from house.models import TelegramNotificationTemplate

    if request.method == "GET":
        templates = TelegramNotificationTemplate.objects.all().order_by("sort_order", "name")
        data = [
            {
                "id": t.id,
                "name": t.name,
                "event_type": t.event_type,
                "template": t.template,
                "is_active": t.is_active,
                "sort_order": t.sort_order,
            }
            for t in templates
        ]
        return JsonResponse({"results": data, "count": len(data)})

    payload = _parse_json(request)
    if payload is None:
        return JsonResponse({"error": "Некоректний JSON."}, status=400)

    action = payload.get("action", "save")
    templates_data = payload.get("templates", [])

    if action == "save":
        TelegramNotificationTemplate.objects.all().delete()
        for idx, t in enumerate(templates_data):
            TelegramNotificationTemplate.objects.create(
                name=t.get("name", ""),
                event_type=t.get("event_type", ""),
                template=t.get("template", ""),
                is_active=t.get("is_active", True),
                sort_order=idx,
            )
        return JsonResponse({"status": "ok", "count": len(templates_data)})

    return JsonResponse({"error": "Невідома дія."}, status=400)

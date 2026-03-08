import re
from urllib.parse import urlparse

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.http import require_GET

from accounts.models import Favorite
from house.api.serializers import serialize_property
from house.models import Property


def _normalize_next_path(raw_next: str | None, default: str = "/") -> str:
    value = (raw_next or "").strip()
    if not value:
        return default
    if value.startswith("/") and not value.startswith("//"):
        return value
    return default


def _normalize_origin(raw_origin: str | None) -> str:
    value = (raw_origin or "").strip()
    if not value:
        return ""
    try:
        parsed = urlparse(value)
    except ValueError:
        return ""
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return ""
    return f"{parsed.scheme}://{parsed.netloc}"


def _normalize_popup_state(raw_state: str | None) -> str:
    value = (raw_state or "").strip()
    if not value or len(value) > 128:
        return ""
    if not re.fullmatch(r"[A-Za-z0-9_-]+", value):
        return ""
    return value


@require_GET
def google_popup_complete(request):
    next_path = _normalize_next_path(request.GET.get("next"), default="/")
    opener_origin = _normalize_origin(request.GET.get("parent_origin"))
    popup_state = _normalize_popup_state(request.GET.get("popup_state"))
    context = {
        "next_path": next_path,
        "opener_origin": opener_origin,
        "popup_state": popup_state,
        "auth_success": bool(request.user.is_authenticated),
    }
    response = render(request, "auth/google_popup_complete.html", context)
    response["X-Robots-Tag"] = "noindex, nofollow"
    return response


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
    properties = [favorite.property for favorite in favorites]
    for property_obj in properties:
        property_obj.absolute_url = request.build_absolute_uri(
            property_obj.get_absolute_url()
        )
    accept = request.headers.get("Accept", "")
    is_ajax = request.headers.get("X-Requested-With") == "XMLHttpRequest"
    if (
        "application/json" in accept
        or is_ajax
        or (request.GET.get("format") or "").lower() == "json"
    ):
        if (request.GET.get("ids") or "").lower() in {"1", "true", "yes"}:
            ids = [property_obj.id for property_obj in properties]
            return JsonResponse({"results": ids, "count": len(ids)})

        payload = [serialize_property(property_obj, request) for property_obj in properties]
        return JsonResponse({"results": payload, "count": len(payload)})

    return render(request, "likes.html", {"properties": properties})


@login_required
def toggle_like(request, property_id):
    property_obj = get_object_or_404(Property, id=property_id)
    favorite, created = Favorite.objects.get_or_create(
        user=request.user, property=property_obj
    )

    if not created:
        favorite.delete()
        return JsonResponse({"status": "unliked"})
    return JsonResponse({"status": "liked"})


def signup(request):
    method = (request.GET.get("method") or "email").lower()
    target = reverse("start_page")
    query = f"register={method}"
    extra = request.GET.copy()
    extra.pop("method", None)
    if extra:
        query = query + "&" + extra.urlencode()
    return redirect(f"{target}?{query}")

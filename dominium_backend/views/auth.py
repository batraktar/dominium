import re
import json
from urllib.parse import urlencode, urlparse

from allauth.socialaccount.models import SocialAccount
from allauth.utils import generate_unique_username
from django.contrib.auth import get_user_model, login
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET, require_POST

from accounts.models import Favorite
from house.api.serializers import serialize_property
from house.models import Property
from accounts.services.google_identity import GoogleIdentityError, verify_google_identity


def _auth_payload(user):
    is_authenticated = bool(user.is_authenticated)
    return {
        "is_authenticated": is_authenticated,
        "is_staff": bool(is_authenticated and user.is_staff),
        "display_name": user.display_name if is_authenticated else "",
        "email": user.email if is_authenticated else "",
        "phone": user.phone_number if is_authenticated else "",
    }


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
@never_cache
def auth_session(request):
    user = request.user
    response = JsonResponse(_auth_payload(user))
    response["Cache-Control"] = "no-store"
    response["Vary"] = "Cookie"
    return response


@require_GET
@never_cache
def google_identity_config(request):
    client_id = str(getattr(settings, "GOOGLE_CLIENT_ID", "") or "").strip()
    response = JsonResponse({"enabled": bool(client_id), "client_id": client_id})
    response["Cache-Control"] = "no-store"
    return response


@require_POST
@never_cache
def google_identity_login(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse(
            {"status": "error", "code": "invalid_json", "message": "Некоректний запит."},
            status=400,
        )

    try:
        identity = verify_google_identity(payload.get("credential", ""))
    except GoogleIdentityError:
        return JsonResponse(
            {
                "status": "error",
                "code": "google_credential_invalid",
                "message": "Не вдалося підтвердити Google-акаунт. Спробуйте ще раз.",
            },
            status=400,
        )

    User = get_user_model()
    with transaction.atomic():
        social = (
            SocialAccount.objects.select_for_update()
            .select_related("user")
            .filter(provider="google", uid=identity.subject)
            .first()
        )
        user = social.user if social else None

        if user is None:
            user = (
                User.objects.select_for_update()
                .filter(email__iexact=identity.email)
                .first()
            )
            if user is not None:
                conflicting = SocialAccount.objects.filter(
                    user=user,
                    provider="google",
                ).exclude(uid=identity.subject)
                if conflicting.exists():
                    return JsonResponse(
                        {
                            "status": "error",
                            "code": "google_account_conflict",
                            "message": "Ця пошта вже привʼязана до іншого Google-акаунта.",
                        },
                        status=409,
                    )
            else:
                username = generate_unique_username(
                    [identity.email.split("@", 1)[0], "google-user"]
                )
                user = User.objects.create_user(
                    username=username,
                    email=identity.email,
                    full_name=identity.full_name,
                    is_email_verified=True,
                )

            SocialAccount.objects.create(
                user=user,
                provider="google",
                uid=identity.subject,
                extra_data={"email": identity.email, "name": identity.full_name},
            )

        if not user.is_active:
            return JsonResponse(
                {
                    "status": "error",
                    "code": "inactive_user",
                    "message": "Акаунт вимкнено.",
                },
                status=403,
            )

        changed_fields = []
        if not user.is_email_verified:
            user.is_email_verified = True
            changed_fields.append("is_email_verified")
        if identity.full_name and not user.full_name:
            user.full_name = identity.full_name
            changed_fields.append("full_name")
        if changed_fields:
            user.save(update_fields=changed_fields)

    login(request, user, backend="django.contrib.auth.backends.ModelBackend")
    return JsonResponse({"status": "ok", "user": _auth_payload(user)})


@require_GET
@never_cache
def google_popup_start(request):
    next_path = _normalize_next_path(request.GET.get("next"), default="/")
    opener_origin = _normalize_origin(request.GET.get("parent_origin"))
    popup_state = _normalize_popup_state(request.GET.get("popup_state"))
    if popup_state and not opener_origin:
        opener_origin = _normalize_origin(request.build_absolute_uri("/"))

    callback_url = next_path
    if popup_state:
        completion_path = reverse("google_popup_complete")
        callback_query = urlencode(
            {
                "next": next_path,
                "parent_origin": opener_origin,
                "popup_state": popup_state,
            }
        )
        callback_url = f"{completion_path}?{callback_query}"
    response = render(
        request,
        "auth/google_popup_start.html",
        {"callback_url": callback_url},
    )
    response["Cache-Control"] = "no-store"
    return response


@require_GET
@never_cache
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
    response["Cache-Control"] = "no-store"
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


@require_POST
def toggle_like(request, property_id):
    if not request.user.is_authenticated:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."},
            status=401,
        )

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

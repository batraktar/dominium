from uuid import uuid4

from django.conf import settings
from django.contrib import messages
from django.contrib.auth import get_user_model, login, logout
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.contrib.sites.shortcuts import get_current_site
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.template.loader import render_to_string
from django.urls import reverse
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.views.decorators.http import require_GET, require_POST

from .models import CustomUser, TelegramVerification

User = get_user_model()


@require_GET
def check_telegram_username(request):
    username = request.GET.get("username", "").lstrip("@")
    exists = User.objects.filter(telegram_username=username).exists()
    return JsonResponse({"available": not exists})


def _open_modal(request, modal, query, prefill=None):
    data = {"open": True}
    if prefill:
        data.update(prefill)
    if modal == "login":
        next_value = request.session.get("login_next")
        if next_value and "next" not in data:
            data["next"] = next_value
    request.session[f"{modal}_prefill"] = data
    return redirect(f"{reverse('start_page')}?{query}")


def register_email(request):
    if not getattr(settings, "ALLOW_MANUAL_AUTH", False):
        messages.error(request, "Локальна реєстрація тимчасово недоступна.")
        return redirect("/")
    if request.method != "POST":
        return _open_modal(request, "register", "register=email")

    email = (request.POST.get("email") or "").strip()
    username = (request.POST.get("username") or "").strip()
    raw_full_name = (request.POST.get("full_name") or "").strip()
    password = request.POST.get("password") or ""
    confirm = request.POST.get("confirm") or ""

    prefill = {
        "email": email,
        "username": username,
        "full_name": raw_full_name,
    }

    def error(msg):
        messages.error(request, msg, extra_tags="register")
        return _open_modal(request, "register", "register=email", prefill)

    if password != confirm:
        return error("Паролі не збігаються")

    if User.objects.filter(email=email).exists():
        return error("Цей email вже використовується")

    if User.objects.filter(username=username).exists():
        return error("Цей username вже зайнятий")

    try:
        validate_password(password, user=CustomUser(username=username, email=email))
    except ValidationError as exc:
        return error(" ".join(exc))

    user = CustomUser.objects.create(
        email=email,
        username=username,
        full_name=raw_full_name or username,
        telegram_username=username,
        password=make_password(password),
        is_active=False,
    )

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    domain = get_current_site(request).domain
    link = f"http://{domain}/activate/{uid}/{token}/"

    message = render_to_string(
        "partials/auth/verify_email.html", {"user": user, "link": link}
    )

    send_mail(
        subject="Підтвердження пошти",
        message=message,
        from_email="Dominium <dominium.realty.agency@gmail.com>",
        recipient_list=[email],
    )

    request.session.pop("register_prefill", None)

    return render(request, "partials/auth/after-register-email.html", {"email": email})


def register_via_telegram(request):
    if not getattr(settings, "ALLOW_MANUAL_AUTH", False):
        messages.error(request, "Telegram-реєстрація вимкнена.")
        return redirect("/")
    if request.method != "POST":
        return _open_modal(request, "telegram", "register=telegram")

    telegram_username = (request.POST.get("telegram_username") or "").lstrip("@")
    raw_full_name = (request.POST.get("full_name") or "").strip()
    password = request.POST.get("password") or ""
    confirm = request.POST.get("confirm") or ""

    prefill = {"username": telegram_username, "full_name": raw_full_name}

    def error(msg):
        messages.error(request, msg, extra_tags="telegram")
        return _open_modal(request, "telegram", "register=telegram", prefill)

    if password != confirm:
        return error("Паролі не збігаються")

    unique_username = telegram_username or f"user_{uuid4().hex[:8]}"

    if telegram_username:
        if User.objects.filter(username=unique_username).exists():
            return error("Користувач з таким username вже існує")
    else:
        while User.objects.filter(username=unique_username).exists():
            unique_username = f"user_{uuid4().hex[:8]}"

    try:
        validate_password(
            password,
            user=CustomUser(
                username=unique_username, telegram_username=telegram_username
            ),
        )
    except ValidationError as exc:
        return error(" ".join(exc))

    user = CustomUser.objects.create(
        username=unique_username,
        telegram_username=telegram_username,
        full_name=raw_full_name or telegram_username or unique_username,
        password=make_password(password),
        is_active=False,
        is_telegram_verified=False,
    )

    TelegramVerification.objects.create(user=user)
    request.session.pop("telegram_prefill", None)

    return render(
        request,
        "partials/auth/after-register-telegram.html",
        {"bot_link": "https://t.me/dominium_realty_agency_bot"},
    )


def verify_telegram_code(request, code):
    verification = get_object_or_404(TelegramVerification, code=code, is_used=False)
    verification.is_used = True
    verification.save()

    user = verification.user
    user.is_telegram_verified = True
    user.is_active = True
    user.save(update_fields=["is_telegram_verified", "is_active"])

    login(request, user)  # автоматичний вхід
    return redirect("/")  # редірект на головну


def login_view(request):
    if request.method == "POST":
        identifier = request.POST.get("email", "").strip()
        password = request.POST.get("password")
        next_url = (
            request.POST.get("next")
            or request.session.pop("login_next", None)
            or request.GET.get("next")
            or "/"
        )

        user = CustomUser.objects.filter(
            Q(email__iexact=identifier)
            | Q(telegram_username__iexact=identifier)
            | Q(username__iexact=identifier)
        ).first()

        if user and check_password(password, user.password):
            if not user.is_active:
                request.session["login_next"] = next_url
                messages.error(
                    request,
                    "Потрібно підтвердити аккаунт. Перевірте email / Telegram.",
                    extra_tags="login",
                )
                return _open_modal(request, "login", "login=1", {"email": identifier})
            user.backend = "django.contrib.auth.backends.ModelBackend"
            login(request, user)
            request.session.pop("login_prefill", None)
            return redirect(next_url or "/")

        request.session["login_next"] = next_url
        messages.error(
            request,
            "Невірний email / username / Telegram або пароль",
            extra_tags="login",
        )
        return _open_modal(request, "login", "login=1", {"email": identifier})

    next_param = request.GET.get("next")
    if next_param:
        request.session["login_next"] = next_param
    return _open_modal(request, "login", "login=1")


from django.contrib.auth import login


def activate(request, uidb64, token):
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except Exception:
        user = None

    if user and default_token_generator.check_token(user, token):
        user.is_active = True
        user.is_email_verified = True
        user.save()

        login(request, user)  # <== автоматичний вхід
        return redirect("/")  # <== редірект на головну
    else:
        return render(request, "partials/auth/email_invalid.html")


@require_POST
def logout_view(request):
    logout(request)
    request.session.flush()
    return redirect("/")

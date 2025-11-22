from django.urls import path

from .views import (
    activate,
    check_telegram_username,
    login_view,
    logout_view,
    register_email,
    register_via_telegram,
    verify_telegram_code,
)

urlpatterns = [
    path("register/telegram/", register_via_telegram, name="register_via_telegram"),
    path("register/email/", register_email, name="register_email"),
    path("activate/<uidb64>/<token>/", activate, name="activate"),
    path("verify/<uuid:code>/", verify_telegram_code, name="verify_telegram"),
    path("login/", login_view, name="login"),
    path("logout/", logout_view, name="logout"),
    path(
        "ajax/check-telegram/", check_telegram_username, name="check_telegram_username"
    ),
]

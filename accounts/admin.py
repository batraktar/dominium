from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = (
        "id",
        "display_name",
        "username",
        "telegram_username",
        "email",
        "is_telegram_verified",
        "is_email_verified",
        "is_staff",
    )
    search_fields = ("username", "telegram_username", "email", "full_name")
    ordering = ("id",)
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "username",
                    "full_name",
                    "telegram_username",
                    "email",
                    "password",
                )
            },
        ),
        ("Permissions", {"fields": ("is_staff", "is_superuser")}),
        ("Verification", {"fields": ("is_telegram_verified", "is_email_verified")}),
        ("Important dates", {"fields": ("last_login",)}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "username",
                    "full_name",
                    "telegram_username",
                    "email",
                    "password1",
                    "password2",
                ),
            },
        ),
    )

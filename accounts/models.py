import uuid

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone

from house.models import Property

from .managers import CustomUserManager


class CustomUser(AbstractBaseUser, PermissionsMixin):
    username = models.CharField(max_length=150, unique=True)  # ← нове поле
    email = models.EmailField(unique=True, blank=True, null=True)
    telegram_username = models.CharField(
        max_length=150, unique=True, blank=True, null=True
    )
    full_name = models.CharField(max_length=255, blank=True)
    phone_number = models.CharField(max_length=30, blank=True, null=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    date_joined = models.DateTimeField(default=timezone.now)
    is_email_verified = models.BooleanField(default=False)
    is_telegram_verified = models.BooleanField(default=False)

    USERNAME_FIELD = "username"  # ← логін по username
    REQUIRED_FIELDS = ["email"]  # ← щоб створити суперкористувача

    objects = CustomUserManager()

    @property
    def display_name(self) -> str:
        if self.full_name:
            return self.full_name
        if self.telegram_username:
            return self.telegram_username
        if self.username:
            return self.username
        if self.email:
            return self.email
        return "користувачу"

    def __str__(self):
        return self.display_name

    class Meta:
        permissions = (("can_download_logs", "Може завантажувати журнали DOMINIUM"),)


class TelegramVerification(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    code = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} - {'used' if self.is_used else 'active'}"


class Favorite(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favorites"
    )
    property = models.ForeignKey(
        Property, on_delete=models.CASCADE, related_name="liked_by"
    )
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "property")


class SavedSearch(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="saved_searches",
        null=True,
        blank=True,
    )
    email = models.EmailField(blank=True, null=True)
    title = models.CharField(max_length=255, default="Збережений пошук")
    params = models.JSONField(default=dict)
    notify = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        base = self.title or "Пошук"
        if self.user:
            return f"{base} ({self.user})"
        if self.email:
            return f"{base} ({self.email})"
        return base

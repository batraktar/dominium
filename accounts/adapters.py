from __future__ import annotations

from typing import Iterable

from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.utils import generate_unique_username
from django.utils.text import slugify


class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    """Auto-fill username/email when signing in through social providers."""

    def populate_user(self, request, sociallogin, data):
        user = super().populate_user(request, sociallogin, data)
        email = (data.get("email") or user.email or "").strip()
        user.email = email or user.email

        full_name = (
            data.get("name")
            or data.get("full_name")
            or " ".join(filter(None, [data.get("first_name"), data.get("last_name")]))
        )
        if full_name:
            user.full_name = full_name.strip()

        base_candidates: Iterable[str] = []
        if email and "@" in email:
            base_candidates = [email.split("@", 1)[0]]
        elif data.get("username"):
            base_candidates = [data["username"]]
        elif data.get("name"):
            base_candidates = [slugify(data["name"])]

        candidates = [candidate for candidate in base_candidates if candidate]
        if not candidates:
            candidates = ["user"]

        user.username = generate_unique_username(candidates)
        return user

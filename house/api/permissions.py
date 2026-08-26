from __future__ import annotations

import logging
from typing import Type

from django.db.models import Model
from rest_framework.permissions import SAFE_METHODS, BasePermission

logger = logging.getLogger(__name__)


class IsStaffWriteOrReadOnly(BasePermission):
    """
    Bank-grade baseline:
    - Read-only for anonymous/public users.
    - Mutations are allowed only for staff/superusers OR users with explicit model perms.
    """

    message = "You do not have permission to modify this resource."

    method_to_permission_action = {
        "POST": "add",
        "PUT": "change",
        "PATCH": "change",
        "DELETE": "delete",
    }

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True

        user = request.user
        if not user or not user.is_authenticated:
            self._log_denied_attempt(
                request=request,
                user=user,
                model_cls=self._resolve_model(view),
                reason="anonymous",
            )
            return False

        if user.is_staff or user.is_superuser:
            return True

        self._log_denied_attempt(
            request=request,
            user=user,
            model_cls=self._resolve_model(view),
            reason="not_staff",
        )
        return False

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return self.has_permission(request, view)

    def _resolve_model(self, view) -> Type[Model] | None:
        explicit_model = getattr(view, "permission_model", None)
        if explicit_model is not None:
            return explicit_model

        queryset = getattr(view, "queryset", None)
        if queryset is not None:
            return getattr(queryset, "model", None)

        get_queryset = getattr(view, "get_queryset", None)
        if callable(get_queryset):
            try:
                resolved_queryset = get_queryset()
            except Exception:
                return None
            return getattr(resolved_queryset, "model", None)

        return None

    def _log_denied_attempt(self, *, request, user, model_cls, reason: str) -> None:
        forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
        client_ip = (
            forwarded_for.split(",")[0].strip()
            if forwarded_for
            else request.META.get("REMOTE_ADDR", "unknown")
        )
        user_id = getattr(user, "pk", None) if user and user.is_authenticated else None
        model_name = model_cls.__name__ if model_cls else "unknown"

        logger.warning(
            "Blocked API write attempt: reason=%s method=%s path=%s ip=%s user_id=%s model=%s",
            reason,
            request.method,
            request.path,
            client_ip,
            user_id,
            model_name,
        )

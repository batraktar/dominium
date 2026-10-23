import logging

from django.contrib.auth.decorators import login_required
from django.http import HttpResponseNotFound, JsonResponse
from django.shortcuts import get_object_or_404, render

from house.models import Property
from dominium_backend.views.common import get_client_ip
from dominium_backend.services.search_console import (
    SearchConsoleNotConfigured,
    get_search_performance,
)

logger = logging.getLogger(__name__)


def search_console_performance(request):
    if not request.user.is_authenticated or not request.user.is_staff:
        return HttpResponseNotFound()
    try:
        period = int(request.GET.get("period", "28"))
    except (TypeError, ValueError):
        period = 0
    if period not in {7, 28, 90}:
        return JsonResponse({"error": "unsupported_period"}, status=400)
    try:
        return JsonResponse(get_search_performance(period))
    except SearchConsoleNotConfigured:
        return JsonResponse({"status": "not_configured"})
    except Exception:
        logger.warning("Search Console request failed")
        return JsonResponse({"status": "unavailable"}, status=502)


def property_api_admin(request):
    if not request.user.is_authenticated or not request.user.is_staff:
        logger.warning(
            "Unauthorized access to /api/admin/",
            extra={
                "path": request.path,
                "ip": get_client_ip(request),
                "user_agent": request.META.get("HTTP_USER_AGENT", ""),
            },
        )
        return HttpResponseNotFound()
    return render(request, "api/property_api_admin.html")


@login_required
def toggle_featured_homepage(request, property_id):
    if not request.user.is_staff:
        return JsonResponse({"error": "forbidden"}, status=403)

    property_obj = get_object_or_404(Property, id=property_id)
    desired = request.POST.get("featured")

    if desired in {"true", "false"}:
        property_obj.featured_homepage = desired == "true"
    else:
        property_obj.featured_homepage = not property_obj.featured_homepage

    property_obj.save(update_fields=["featured_homepage"])
    return JsonResponse({"status": "ok", "featured": property_obj.featured_homepage})

import logging

from django.http import HttpResponseNotFound
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render

from house.models import Property
from landing_doominium_real_state.views.common import get_client_ip

logger = logging.getLogger(__name__)


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

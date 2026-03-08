import requests
from django.conf import settings
from django.contrib.auth.decorators import user_passes_test
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from house.services.importer import (
    InvalidImportURL,
    PropertyImportError,
    import_property_from_url,
)


def _is_staff(user):
    return user.is_authenticated and user.is_staff


@require_http_methods(["POST"])
@user_passes_test(_is_staff)
def import_property_by_url(request):
    url = request.POST.get("url")
    geocode_flag = str(request.POST.get("geocode", "")).strip().lower()
    geocode = geocode_flag in {"1", "true", "on", "yes"}
    timeout = getattr(settings, "REQUESTS_TIMEOUT", 10)

    try:
        property_obj, warnings = import_property_from_url(
            url,
            timeout=timeout,
            geocode_missing=geocode,
        )
    except InvalidImportURL as exc:
        return JsonResponse({"status": "error", "message": str(exc)}, status=400)
    except requests.RequestException as exc:
        return JsonResponse(
            {
                "status": "error",
                "message": "Не вдалося завантажити HTML",
                "details": str(exc),
            },
            status=502,
        )
    except PropertyImportError as exc:
        return JsonResponse({"status": "error", "message": str(exc)}, status=422)
    except Exception as exc:
        return JsonResponse({"status": "error", "message": str(exc)}, status=500)

    response_data = {"status": "ok", "id": property_obj.id}
    if warnings:
        response_data["warnings"] = warnings

    return JsonResponse(response_data)

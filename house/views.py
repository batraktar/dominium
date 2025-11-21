import requests
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from house.services.importer import (
    InvalidImportURL,
    PropertyImportError,
    import_property_from_url,
)


@csrf_exempt
def import_property_by_url(request):
    if request.method != "POST":
        return JsonResponse(
            {"status": "error", "message": "Only POST allowed"}, status=405
        )

    url = request.POST.get("url")
    timeout = getattr(settings, "REQUESTS_TIMEOUT", 10)

    try:
        property_obj, warnings = import_property_from_url(url, timeout=timeout)
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

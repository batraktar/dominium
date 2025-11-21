from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse

from accounts.models import Favorite
from house.models import Property


@login_required
def liked_properties_view(request):
    favorites = (
        Favorite.objects.filter(user=request.user)
        .select_related(
            "property__deal_type",
            "property__property_type",
        )
        .prefetch_related("property__images")
    )
    properties = [favorite.property for favorite in favorites]
    for property_obj in properties:
        property_obj.absolute_url = request.build_absolute_uri(
            property_obj.get_absolute_url()
        )
    return render(request, "likes.html", {"properties": properties})


@login_required
def toggle_like(request, property_id):
    property_obj = get_object_or_404(Property, id=property_id)
    favorite, created = Favorite.objects.get_or_create(
        user=request.user, property=property_obj
    )

    if not created:
        favorite.delete()
        return JsonResponse({"status": "unliked"})
    return JsonResponse({"status": "liked"})


def signup(request):
    method = (request.GET.get("method") or "email").lower()
    target = reverse("start_page")
    query = f"register={method}"
    extra = request.GET.copy()
    extra.pop("method", None)
    if extra:
        query = query + "&" + extra.urlencode()
    return redirect(f"{target}?{query}")

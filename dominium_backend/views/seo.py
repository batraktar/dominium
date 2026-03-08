from __future__ import annotations

from django.conf import settings
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.views.decorators.http import require_GET

from house.models import Property
from dominium_backend.views.common import (
    build_absolute_uri,
    build_canonical_uri,
    get_site_base_url,
)


@require_GET
def robots_txt(request):
    if str(getattr(settings, "SEO_CANONICAL_HOST", "") or "").strip():
        site_base_url = get_site_base_url(request, canonical=True)
    else:
        site_base_url = get_site_base_url(request, canonical=False)
    rendered = render_to_string("robots.txt", {"site_base_url": site_base_url})
    return HttpResponse(rendered, content_type="text/plain")


@require_GET
def image_sitemap(request):
    queryset = (
        Property.objects.filter(is_archived=False)
        .prefetch_related("images")
        .order_by("-created_at")
    )

    entries = []
    for property_obj in queryset:
        image_items = []
        for image_obj in property_obj.images.all():
            if not getattr(image_obj, "image", None):
                continue
            image_items.append(
                {
                    "loc": build_absolute_uri(request, image_obj.image.url, canonical=True),
                    "title": property_obj.title,
                    "caption": f"{property_obj.title} — {property_obj.address}",
                }
            )

        if not image_items:
            continue

        entries.append(
            {
                "loc": build_canonical_uri(request, property_obj.get_absolute_url()),
                "lastmod": property_obj.created_at.date().isoformat(),
                "images": image_items[:25],
            }
        )

    xml = render_to_string("sitemaps/image_sitemap.xml", {"entries": entries})
    return HttpResponse(xml, content_type="application/xml")

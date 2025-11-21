from __future__ import annotations

from datetime import datetime

from django.contrib.sitemaps import Sitemap
from django.urls import reverse

from house.models import Property


class StaticViewSitemap(Sitemap):
    priority = 0.8
    changefreq = "weekly"

    def items(self):
        return ["start_page", "property_search"]

    def location(self, item):
        return reverse(item)


class PropertySitemap(Sitemap):
    priority = 0.9
    changefreq = "daily"

    def items(self):
        return (
            Property.objects.filter(is_active=True)
            if hasattr(Property, "is_active")
            else Property.objects.all()
        )

    def lastmod(self, obj: Property) -> datetime | None:
        return getattr(obj, "updated_at", obj.created_at)

    def location(self, obj: Property) -> str:
        return obj.get_absolute_url()

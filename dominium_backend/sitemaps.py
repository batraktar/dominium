from __future__ import annotations

from datetime import datetime

from django.contrib.sitemaps import Sitemap
from django.urls import reverse

from house.models import Property
from dominium_backend.seo_regions import (
    CITY_LANDING_CONFIG,
    REGION_LANDING_CONFIG,
)


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
        queryset = Property.objects.filter(is_archived=False)
        if hasattr(Property, "is_active"):
            queryset = queryset.filter(is_active=True)
        return queryset.order_by("-created_at")

    def lastmod(self, obj: Property) -> datetime | None:
        return getattr(obj, "updated_at", obj.created_at)

    def location(self, obj: Property) -> str:
        return obj.get_absolute_url()


class RegionLandingSitemap(Sitemap):
    priority = 0.8
    changefreq = "weekly"

    def items(self):
        return list(REGION_LANDING_CONFIG.keys())

    def location(self, item: str) -> str:
        return reverse("region_landing", kwargs={"region_slug": item})


class CityLandingSitemap(Sitemap):
    priority = 0.7
    changefreq = "weekly"

    def items(self):
        return list(CITY_LANDING_CONFIG.keys())

    def location(self, item: str) -> str:
        return reverse("city_landing", kwargs={"city_slug": item})

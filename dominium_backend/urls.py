from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.sitemaps.views import sitemap
from django.shortcuts import render
from django.urls import include, path

from dominium_backend.sitemaps import (
    CityLandingSitemap,
    PropertySitemap,
    RegionLandingSitemap,
    StaticViewSitemap,
)
from dominium_backend.views import admin as admin_views
from dominium_backend.views import auth as auth_views
from dominium_backend.views.common import build_canonical_uri
from dominium_backend.views import public as public_views
from dominium_backend.views import security as security_views
from dominium_backend.views import seo as seo_views
from dominium_backend.views import spa as spa_views

sitemaps = {
    "static": StaticViewSitemap(),
    "properties": PropertySitemap(),
    "regions": RegionLandingSitemap(),
    "cities": CityLandingSitemap(),
}

urlpatterns = [
    path("", include("accounts.urls")),
    path("admin/", admin.site.urls),
    path("", public_views.base, name="start_page"),
    path("search/", spa_views.search_spa, name="property_search"),
    path(
        "search/region/<slug:region_slug>/",
        spa_views.search_region_spa,
        name="region_landing",
    ),
    path(
        "search/city/<slug:city_slug>/",
        spa_views.search_city_spa,
        name="city_landing",
    ),
    path("signup/", spa_views.signup_spa, name="landing"),
    path("api/demo/", spa_views.property_api_demo_spa, name="property_api_demo"),
    path("api/admin/", spa_views.property_api_admin_spa, name="property_api_admin"),
    path(
        "test/map/interactive/",
        spa_views.interactive_map_test_spa,
        name="interactive_map_test",
    ),
    path(
        "test/map/interactive/data/",
        public_views.interactive_map_test_data,
        name="interactive_map_test_data",
    ),
    path("api/", include("house.api.urls")),
    path("accounts/", include("allauth.urls")),
    path(
        "auth/popup-complete/",
        auth_views.google_popup_complete,
        name="google_popup_complete",
    ),
    path(
        "property/<slug:slug>/",
        spa_views.property_detail_spa,
        name="property_detail",
    ),
    path(
        "properties/<int:property_id>/toggle-featured/",
        admin_views.toggle_featured_homepage,
        name="toggle_featured_homepage",
    ),
    path("consultation/", public_views.consultation_view, name="consultation"),
    path("like/<int:property_id>/", auth_views.toggle_like, name="toggle_like"),
    path("likes/", spa_views.likes_spa, name="liked_properties"),
    path("_csp/report/", security_views.csp_report_view, name="csp_report"),
    path("robots.txt", seo_views.robots_txt, name="robots_txt"),
    path("sitemap.xml", sitemap, {"sitemaps": sitemaps}, name="sitemap"),
    path("sitemap-images.xml", seo_views.image_sitemap, name="sitemap_images"),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
if settings.DEBUG:  # Додаємо підтримку медіафайлів у режимі розробки
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


def custom_404_view(request, exception):
    context = {
        "meta_title": "Сторінку не знайдено - DOMINIUM",
        "meta_description": "Запитана сторінка не знайдена.",
        "canonical_url": build_canonical_uri(request, request.path),
        "meta_robots": "noindex, nofollow",
        "og_type": "website",
        "og_title": "Сторінку не знайдено - DOMINIUM",
    }
    response = render(request, "404.html", context, status=404)
    response["X-Robots-Tag"] = context["meta_robots"]
    return response


handler404 = "dominium_backend.urls.custom_404_view"

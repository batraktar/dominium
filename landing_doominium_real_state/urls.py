from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.sitemaps.views import sitemap
from django.shortcuts import render
from django.urls import include, path
from django.views.generic import TemplateView
from landing_doominium_real_state.views import (
    SearchFiltersView,
    consultation_view,
    toggle_like,
    toggle_featured_homepage,
    liked_properties_view,
    property_api_demo,
    property_api_admin,
)

from landing_doominium_real_state import views
from landing_doominium_real_state.sitemaps import PropertySitemap, StaticViewSitemap

sitemaps = {
    "static": StaticViewSitemap(),
    "properties": PropertySitemap(),
}

urlpatterns = [
    path("", include("accounts.urls")),
    path("admin/", admin.site.urls),
    path("", views.base, name="start_page"),
    path("search/", SearchFiltersView.as_view(), name="property_search"),
    path("search/save/", views.save_search, name="save_search"),
    path("signup/", views.signup, name="landing"),
    path("admin-panel/", include("house.urls_admin_panel")),
    path("api/demo/", property_api_demo, name="property_api_demo"),
    path("api/", include("house.api.urls")),
    path("api/admin/", property_api_admin, name="property_api_admin"),
    path("accounts/", include("allauth.urls")),
    path("property/<slug:slug>/", views.property_detail, name="property_detail"),
    path(
        "properties/<int:property_id>/toggle-featured/",
        toggle_featured_homepage,
        name="toggle_featured_homepage",
    ),
    path("consultation/", consultation_view, name="consultation"),
    path("like/<int:property_id>/", toggle_like, name="toggle_like"),
    path("likes/", liked_properties_view, name="liked_properties"),
    path(
        "robots.txt",
        TemplateView.as_view(template_name="robots.txt", content_type="text/plain"),
    ),
    path("sitemap.xml", sitemap, {"sitemaps": sitemaps}, name="sitemap"),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
if settings.DEBUG:  # Додаємо підтримку медіафайлів у режимі розробки
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


def custom_404_view(request, exception):
    return render(request, "404.html", status=404)


handler404 = "landing_doominium_real_state.urls.custom_404_view"

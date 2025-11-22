from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.sitemaps.views import sitemap
from django.shortcuts import render
from django.urls import include, path
from django.views.generic import TemplateView

from landing_doominium_real_state.sitemaps import (PropertySitemap,
                                                   StaticViewSitemap)
from landing_doominium_real_state.views import admin as admin_views
from landing_doominium_real_state.views import auth as auth_views
from landing_doominium_real_state.views import public as public_views
from landing_doominium_real_state.views import search as search_views

sitemaps = {
    "static": StaticViewSitemap(),
    "properties": PropertySitemap(),
}

urlpatterns = [
    path("", include("accounts.urls")),
    path("admin/", admin.site.urls),
    path("", public_views.base, name="start_page"),
    path("search/", search_views.SearchFiltersView.as_view(), name="property_search"),
    path("signup/", auth_views.signup, name="landing"),
    path("api/demo/", public_views.property_api_demo, name="property_api_demo"),
    path("api/admin/", admin_views.property_api_admin, name="property_api_admin"),
    path("api/", include("house.api.urls")),
    path("accounts/", include("allauth.urls")),
    path(
        "property/<slug:slug>/",
        public_views.property_detail,
        name="property_detail",
    ),
    path(
        "properties/<int:property_id>/toggle-featured/",
        admin_views.toggle_featured_homepage,
        name="toggle_featured_homepage",
    ),
    path("consultation/", public_views.consultation_view, name="consultation"),
    path("like/<int:property_id>/", auth_views.toggle_like, name="toggle_like"),
    path("likes/", auth_views.liked_properties_view, name="liked_properties"),
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

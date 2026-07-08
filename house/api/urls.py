from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import views

app_name = "house_api"

urlpatterns = [
    path("csrf/", views.csrf_token_view, name="csrf_token"),
    path("auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("properties/", views.property_collection, name="property_list"),
    path("properties/by-slug/<slug:slug>/", views.property_by_slug, name="property_by_slug"),
    path("properties/<int:property_id>/", views.property_item, name="property_detail"),
    path(
        "properties/bulk-action/",
        views.property_bulk_action,
        name="property_bulk_action",
    ),
    path(
        "properties/<int:property_id>/images/",
        views.property_image_list,
        name="property_images",
    ),
    path(
        "properties/images/<int:image_id>/",
        views.property_image_detail,
        name="property_image_detail",
    ),
    path(
        "properties/<int:property_id>/images/order/",
        views.property_images_reorder,
        name="property_images_reorder",
    ),
    path("property-types/", views.property_type_collection, name="property_type_list"),
    path("deal-types/", views.deal_type_collection, name="deal_type_list"),
    path("features/", views.feature_collection, name="feature_list"),
    path(
        "liked-properties/",
        views.liked_properties_collection,
        name="liked_properties",
    ),
    path(
        "highlight-settings/", views.highlight_settings_view, name="highlight_settings"
    ),
    path("properties/import/", views.property_import, name="property_import"),
    path(
        "properties/import-html/",
        views.property_import_html,
        name="property_import_html",
    ),
    path(
        "properties/import-link/",
        views.property_import_link,
        name="property_import_link",
    ),
    path("crm/sync/", views.crm_sync_view, name="crm_sync"),
    path("settings/", views.app_settings_view, name="app_settings"),
    path("telegram-templates/", views.telegram_templates_view, name="telegram_templates"),
    path("property-cities/", views.property_cities_view, name="property_cities"),
    path("clients/", views.clients_list_view, name="clients_list"),
    path("stats/", views.stats_view, name="stats"),
]]

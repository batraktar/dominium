from django.urls import path

from . import views

app_name = "house_api"

urlpatterns = [
    path("properties/", views.property_collection, name="property_list"),
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
]

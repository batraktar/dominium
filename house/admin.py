import os

from django import forms
from django.contrib import admin, messages
from django.shortcuts import render
from django.urls import path
from django.utils.html import format_html

from .models import (DealType, Feature, HomepageHighlightSettings, Property,
                     PropertyImage, PropertyType)
from .utils.html_parser import \
    parse_property_from_html  # 💡 не забудь __init__.py


# === Додаткові моделі ===
@admin.register(PropertyType)
class PropertyTypeAdmin(admin.ModelAdmin):
    list_display = ["name"]


@admin.register(DealType)
class DealTypeAdmin(admin.ModelAdmin):
    list_display = ["name"]


@admin.register(Feature)
class FeatureAdmin(admin.ModelAdmin):
    list_display = ["name"]


# === Інлайн для фото ===
class PropertyImageInline(admin.TabularInline):
    model = PropertyImage
    extra = 1
    max_num = 10
    fields = ["image", "is_main", "preview"]
    readonly_fields = ["preview"]

    def preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" width="100" />', obj.image.url)
        return "-"


# === Форма для імпорту HTML ===
class ImportHTMLForm(forms.Form):
    html_file = forms.FileField()


# === PropertyAdmin ===
@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    inlines = [PropertyImageInline]
    list_display = ["title", "address", "price", "featured_homepage"]
    list_editable = ["featured_homepage"]
    exclude = ["latitude", "longitude"]
    filter_horizontal = ["features"]
    list_filter = ["featured_homepage", "property_type", "deal_type"]

    # change_list_template = "admin/property_changelist.html"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path("import-html/", self.admin_site.admin_view(self.import_html))
        ]
        return custom_urls + urls

    def import_html(self, request):
        if request.method == "POST":
            form = ImportHTMLForm(request.POST, request.FILES)
            if form.is_valid():
                html_file = form.cleaned_data["html_file"]
                temp_path = f"/tmp/{html_file.name}"
                with open(temp_path, "wb+") as f:
                    for chunk in html_file.chunks():
                        f.write(chunk)

                data = parse_property_from_html(temp_path)
                os.remove(temp_path)

                property = Property.objects.create(
                    title=data["title"],
                    address=data["address"],
                    price=data["price"],
                    description=data["description"],
                    image=data["main_image"],  # якщо в тебе це ImageField або URLField
                )

                messages.success(request, f"Успішно створено об'єкт: {property.title}")
                return render(
                    request, "admin/import_html.html", {"form": ImportHTMLForm()}
                )

        else:
            form = ImportHTMLForm()

        return render(request, "admin/import_html.html", {"form": form})


@admin.register(HomepageHighlightSettings)
class HomepageHighlightSettingsAdmin(admin.ModelAdmin):
    fieldsets = (
        (None, {"fields": ("limit",)}),
        (
            "Фільтри для автопідбору",
            {
                "fields": (
                    "price_min",
                    "price_max",
                    "region_keyword",
                    "property_types",
                ),
                "description": "Умови застосовуються, якщо на головній не вистачає об'єктів, відзначених вручну.",
            },
        ),
    )
    filter_horizontal = ("property_types",)
    list_display = ["limit", "price_min", "price_max", "region_keyword", "updated_at"]

    def has_add_permission(self, request):
        if HomepageHighlightSettings.objects.exists():
            return False
        return super().has_add_permission(request)

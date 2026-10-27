from django import forms
import json
from django.contrib import admin, messages
from django.shortcuts import render
from django.urls import path
from django.utils.html import format_html

from .models import (
    AppSettings,
    Client,
    DealType,
    ExternalProperty,
    Feature,
    HomepageHighlightSettings,
    Property,
    PropertyImage,
    PropertyType,
    SearchConsoleSettings,
    TelegramNotificationTemplate,
)
from .services.importer import import_images_from_parsed
from .utils.html_parser import parse_property_html
from .utils.sanitization import sanitize_rich_text


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


@admin.register(ExternalProperty)
class ExternalPropertyAdmin(admin.ModelAdmin):
    list_display = [
        "crm_property_id",
        "crm_manager_name",
        "crm_manager_user_id",
        "source",
        "sync_status",
        "last_synced",
    ]
    search_fields = ["crm_property_id", "crm_manager_name", "property__title"]
    list_filter = ["source", "sync_status"]
    readonly_fields = ["raw_data", "last_synced"]


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
                raw_html = html_file.read()
                if len(raw_html) > 2 * 1024 * 1024:
                    messages.error(request, "HTML-файл занадто великий (максимум 2 МБ).")
                    return render(
                        request, "admin/import_html.html", {"form": ImportHTMLForm()}
                    )

                try:
                    html = raw_html.decode("utf-8")
                except UnicodeDecodeError:
                    html = raw_html.decode("cp1251", errors="replace")

                parsed = parse_property_html(
                    html,
                    source=getattr(html_file, "name", "import.html"),
                ).as_dict()

                property_type_name = (parsed.get("property_type") or "").strip()
                deal_type_name = (parsed.get("deal_type") or "").strip()

                property_type = None
                if property_type_name:
                    property_type = PropertyType.objects.filter(
                        name__iexact=property_type_name
                    ).first() or PropertyType.objects.create(name=property_type_name)

                deal_type = None
                if deal_type_name:
                    deal_type = DealType.objects.filter(name__iexact=deal_type_name).first()
                    if deal_type is None:
                        deal_type = DealType.objects.create(name=deal_type_name)

                property = Property.objects.create(
                    title=(parsed.get("title") or "Об'єкт DOMINIUM").strip(),
                    address=(parsed.get("address") or "").strip(),
                    price=parsed.get("price") or 0,
                    area=max(1, int(round(parsed.get("area") or 0))),
                    rooms=max(1, int(parsed.get("rooms") or 1)),
                    description=sanitize_rich_text(parsed.get("description_html") or ""),
                    property_type=property_type,
                    deal_type=deal_type,
                    latitude=parsed.get("latitude"),
                    longitude=parsed.get("longitude"),
                )
                warnings = import_images_from_parsed(property, parsed)

                if warnings:
                    messages.warning(
                        request,
                        f"Об'єкт створено з попередженнями: {'; '.join(warnings[:3])}",
                    )
                else:
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


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ["crm_id", "name", "phone", "email"]
    search_fields = ["name", "phone", "email", "crm_id"]


@admin.register(AppSettings)
class AppSettingsAdmin(admin.ModelAdmin):
    list_display = ["key", "updated_at"]


class SearchConsoleSettingsForm(forms.ModelForm):
    service_account_json = forms.CharField(
        required=False,
        label="Service account JSON",
        help_text="Вставте повний JSON ключа. Після збереження значення приховується; порожнє поле збереже чинний ключ.",
        widget=forms.PasswordInput(render_value=False, attrs={"autocomplete": "new-password"}),
    )

    class Meta:
        model = SearchConsoleSettings
        fields = ["site_url", "service_account_json", "cache_seconds"]

    def clean_service_account_json(self):
        value = self.cleaned_data.get("service_account_json", "").strip()
        if not value and self.instance.pk:
            return SearchConsoleSettings.objects.only("service_account_json").get(pk=self.instance.pk).service_account_json
        if not value:
            return ""
        try:
            payload = json.loads(value)
        except json.JSONDecodeError as exc:
            raise forms.ValidationError("Некоректний JSON-файл.") from exc
        if not isinstance(payload, dict) or payload.get("type") != "service_account":
            raise forms.ValidationError("Потрібен JSON ключа Google service account.")
        for field in ("client_email", "private_key", "token_uri"):
            if not payload.get(field):
                raise forms.ValidationError(f"У JSON відсутнє поле {field}.")
        return value


@admin.register(SearchConsoleSettings)
class SearchConsoleSettingsAdmin(admin.ModelAdmin):
    form = SearchConsoleSettingsForm
    list_display = ["site_url", "configured", "cache_seconds", "updated_at"]
    fieldsets = ((None, {"fields": ("site_url", "service_account_json", "cache_seconds"), "description": "Readonly-доступ до Search Console. Секрет не показується після збереження."}),)

    @admin.display(boolean=True, description="Ключ налаштовано")
    def configured(self, obj):
        return bool(obj.service_account_json)

    def has_add_permission(self, request):
        return not SearchConsoleSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(TelegramNotificationTemplate)
class TelegramNotificationTemplateAdmin(admin.ModelAdmin):
    list_display = ["name", "event_type", "is_active", "sort_order"]
    list_editable = ["is_active", "sort_order"]
    list_filter = ["event_type", "is_active"]

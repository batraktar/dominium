import json
import os
import random
import uuid
from io import BytesIO

from django.core.files.base import ContentFile
from django.db import models
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.utils.text import slugify
from PIL import Image


class PropertyType(models.Model):
    name = models.CharField(max_length=50)
    slug = models.SlugField(unique=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
            # якщо такий slug вже існує — додаємо "-1", "-2" і т.д.
            original_slug = self.slug
            counter = 1
            while (
                PropertyType.objects.filter(slug=self.slug).exclude(pk=self.pk).exists()
            ):
                self.slug = f"{original_slug}-{counter}"
                counter += 1
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class DealType(models.Model):
    name = models.CharField(max_length=50)  # Наприклад: Оренда / Продаж

    def __str__(self):
        return self.name


class Feature(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class Client(models.Model):
    crm_id = models.PositiveIntegerField(unique=True, help_text="ID клієнта в CRM")
    name = models.CharField(max_length=255, blank=True, default="")
    phone = models.CharField(max_length=50, blank=True, default="")
    email = models.CharField(max_length=255, blank=True, default="")
    crm_url = models.URLField(blank=True, default="")
    raw_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name or f"Client #{self.crm_id}"

    class Meta:
        ordering = ["-created_at"]


class Property(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, max_length=4569)
    address = models.CharField(max_length=255)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    area = models.PositiveIntegerField()
    rooms = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_archived = models.BooleanField(default=False)
    featured_homepage = models.BooleanField(
        default=False,
        help_text="Відзначте, щоб показувати об'єкт у блоці «Топ 3» на головній сторінці.",
    )

    property_type = models.ForeignKey(
        "PropertyType", on_delete=models.SET_NULL, null=True, blank=True
    )
    deal_type = models.ForeignKey(
        "DealType", on_delete=models.SET_NULL, null=True, blank=True
    )
    features = models.ManyToManyField("Feature", blank=True)
    client = models.ForeignKey(
        "Client", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="properties", help_text="Власник об'єкта з CRM"
    )

    external_source = models.CharField(
        max_length=20,
        blank=True,
        default="",
        choices=[
            ("", "Власний"),
            ("realtsoft", "Realtsoft CRM"),
            ("import", "Імпорт"),
        ],
        help_text="Джерело об'єкта.",
    )
    external_id = models.CharField(
        max_length=100,
        blank=True,
        default="",
        db_index=True,
        help_text="ID об'єкта у зовнішній системі.",
    )
    price_currency = models.CharField(
        max_length=3,
        blank=True,
        default="USD",
        choices=[
            ("USD", "USD"),
            ("EUR", "EUR"),
            ("UAH", "UAH"),
        ],
        help_text="Валюта ціни.",
    )

    slug = models.SlugField(unique=True, blank=True)

    def get_absolute_url(self):
        return reverse("property_detail", kwargs={"slug": self.slug})

    def __str__(self):
        return self.title

    # Генерація slug, де замість ID використовується хеш (6 символів із UUID)
    def generate_semantic_slug(self):
        suffix = uuid.uuid4().hex[:6]
        return slugify(f"{self.area}-{self.address}-{self.rooms}k-{suffix}")

    def generate_data_driven_slug(self):
        suffix = uuid.uuid4().hex[:6]
        return slugify(f"{self.title}-{self.address}-{int(self.price)}usd-{suffix}")

    def generate_branded_slug(self):
        brand_tokens = [
            "estate",
            "capital",
            "vista",
            "prime",
            "terra",
            "urbis",
            "noble",
            "domus",
            "valley",
            "atlas",
        ]
        word = random.choice(brand_tokens)
        suffix = uuid.uuid4().hex[:6]
        return slugify(f"dominium-{self.title}-{word}-{suffix}")

    def save(self, *args, **kwargs):
        creating = self.pk is None  # Чи об'єкт щойно створюється

        original_lat = None
        original_lon = None
        address_changed = creating

        if not creating and self.pk:
            try:
                original = (
                    self.__class__.objects.only("address", "latitude", "longitude")
                    .filter(pk=self.pk)
                    .first()
                )
            except Exception:
                original = None

            if original:
                address_changed = (original.address or "") != (self.address or "")
                original_lat = original.latitude
                original_lon = original.longitude

                if not address_changed:
                    if self.latitude is None and original_lat is not None:
                        self.latitude = original_lat
                    if self.longitude is None and original_lon is not None:
                        self.longitude = original_lon
            else:
                address_changed = True

        # Генеруємо slug, якщо він ще не встановлений
        if not self.slug:
            base_slug = self.generate_data_driven_slug()
            slug = base_slug
            n = 1
            while Property.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{n}"
                n += 1
            self.slug = slug

        # Фінальне збереження
        super().save(*args, **kwargs)

    @property
    def images_json(self):
        """Список URL всіх зображень (використовують JS-галереї)."""
        return mark_safe(json.dumps([img.image.url for img in self.images.all()]))

    @property
    def main_image(self):
        return self.images.filter(is_main=True).first() or self.images.first()

    class Meta:
        indexes = [
            models.Index(fields=["featured_homepage"]),
            models.Index(fields=["is_archived"]),
            models.Index(fields=["price"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["deal_type"]),
            models.Index(fields=["property_type"]),
            models.Index(fields=["external_source", "external_id"]),
        ]


class ExternalProperty(models.Model):
    SOURCE_CHOICES = [
        ("realtsoft", "Realtsoft CRM"),
        ("manual", "Вручну"),
        ("import", "Імпорт"),
    ]

    crm_property_id = models.PositiveIntegerField(
        help_text="ID об'єкта в CRM (Realtsoft).",
    )
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name="external_sources",
    )
    crm_url = models.URLField(
        blank=True,
        default="",
        help_text="URL об'єкта в CRM.",
    )
    raw_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Оригінальні дані з CRM для історії.",
    )
    last_synced = models.DateTimeField(auto_now=True)
    sync_status = models.CharField(
        max_length=20,
        choices=[
            ("synced", "Синхронізовано"),
            ("error", "Помилка"),
            ("pending", "Очікує"),
        ],
        default="synced",
    )
    source = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
        default="realtsoft",
    )

    class Meta:
        unique_together = [("crm_property_id", "source")]
        indexes = [
            models.Index(fields=["crm_property_id"]),
            models.Index(fields=["source"]),
            models.Index(fields=["last_synced"]),
        ]

    def __str__(self):
        return f"ExternalProperty {self.crm_property_id} ({self.source}) → {self.property}"


class HomepageHighlightSettings(models.Model):
    """Правила автоматичного відбору об'єктів для головної сторінки."""

    limit = models.PositiveSmallIntegerField(
        default=3,
        help_text="Скільки об'єктів показувати на головній (використовується, якщо недостатньо ручного вибору).",
    )
    price_min = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Мінімальна ціна (USD). Залиште порожнім, щоб не обмежувати.",
    )
    price_max = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Максимальна ціна (USD). Залиште порожнім, щоб не обмежувати.",
    )
    region_keyword = models.CharField(
        max_length=255,
        blank=True,
        help_text="Ключове слово/район для пошуку в адресі (наприклад, «Київ», «Поділ»).",
    )
    property_types = models.ManyToManyField(
        PropertyType,
        blank=True,
        help_text="Якщо обрано — підбірка буде обмежена цими типами нерухомості.",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Налаштування головної підбірки"
        verbose_name_plural = "Налаштування головної підбірки"

    def __str__(self):
        return "Налаштування головної сторінки"


class PropertyImage(models.Model):
    property = models.ForeignKey(
        Property, related_name="images", on_delete=models.CASCADE
    )
    # 1. upload_to залишаємо ту саму папку — більше не дублюємо
    image = models.ImageField(upload_to="property_images/")
    is_main = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "-id"]

    def save(self, *args, **kwargs):
        if self.is_main:
            # обнуляємо всі інші головні фото цього property
            PropertyImage.objects.filter(property=self.property, is_main=True).update(
                is_main=False
            )
        if self.sort_order == 0:
            max_order = (
                PropertyImage.objects.filter(property=self.property)
                .aggregate(models.Max("sort_order"))
                .get("sort_order__max")
            )
            self.sort_order = (max_order or 0) + 1

        if self.image and not self.image.name.endswith(".webp"):
            filename = os.path.basename(self.image.name)
            self.image = self.convert_to_webp(self.image, filename)

        super().save(*args, **kwargs)

    def convert_to_webp(self, image_field, filename):
        img = Image.open(image_field)

        max_width = 1280
        if img.width > max_width:
            height = int((max_width / img.width) * img.height)
            img = img.resize((max_width, height), Image.LANCZOS)

        img = img.convert("RGB")

        buffer = BytesIO()
        img.save(buffer, format="WEBP", quality=70, method=6)

        # filename уже без шляху, наприклад 'aed02f3....webp'
        webp_name = filename.rsplit(".", 1)[0] + ".webp"

        # повертаємо ContentFile — Django додасть 'property_images/' з upload_to
        return ContentFile(buffer.getvalue(), name=webp_name)


class AppSettings(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Setting: {self.key}"

    class Meta:
        verbose_name = "Налаштування додатку"
        verbose_name_plural = "Налаштування додатку"

    @classmethod
    def get(cls, key, default=None):
        try:
            return cls.objects.get(key=key).value
        except cls.DoesNotExist:
            return default

    @classmethod
    def set(cls, key, value):
        obj, _ = cls.objects.update_or_create(key=key, defaults={"value": value})
        return obj


class TelegramNotificationTemplate(models.Model):
    name = models.CharField(max_length=100)
    event_type = models.CharField(max_length=50, choices=[
        ("new_property", "Новий об'єкт"),
        ("price_changed", "Зміна ціни"),
        ("new_inquiry", "Нова заявка"),
        ("status_changed", "Зміна статусу"),
    ])
    template = models.TextField(
        help_text="Шаблон повідомлення. Доступні змінні: {title}, {price}, {address}, {rooms}, {area}, {link}"
    )
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.get_event_type_display()})"

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name = "Шаблон повідомлення"
        verbose_name_plural = "Шаблони повідомлень"

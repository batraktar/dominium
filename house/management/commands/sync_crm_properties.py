from __future__ import annotations

import logging
import traceback
from decimal import Decimal, InvalidOperation
from typing import Any

import requests
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from PIL import Image as PILImage
from io import BytesIO

from house.models import (
    Client,
    DealType,
    ExternalProperty,
    Property,
    PropertyImage,
    PropertyType,
)
from house.services.realtsoft_client import (
    RealtsoftAPIError,
    get_realtsoft_client,
)
from house.utils.sanitization import sanitize_rich_text

logger = logging.getLogger(__name__)

REALTY_TYPE_MAP = {
    "1": "Квартира",
    "2": "Кімната",
    "3": "Будинок",
    "10": "Офіс",
    "11": "Торгівельна площа",
    "12": "Складське приміщення",
    "13": "Виробниче приміщення",
    "14": "Об'єкт сфери харчування",
    "15": "Об'єкт сфери обслуговування",
    "16": "Інший об'єкт",
    "20": "Земля під інд. будівництво",
    "21": "Земля під сад, город",
    "22": "Земля сільгосппризначення",
    "23": "Земля комерційного призначення",
}

DEAL_TYPE_MAP = {
    "1": "Продаж",
    "2": "Оренда",
    "3": "Посуточно",
}

CURRENCY_MAP = {
    "1": "EUR",
    "2": "UAH",
    "3": "USD",
}


def _safe_int(value: Any, default: int = 0) -> int:
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _safe_decimal(value: Any) -> Decimal | None:
    if value is None:
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None


def _resolve_type(name: str | None) -> PropertyType | None:
    if not name or not name.strip():
        return None
    normalized = name.strip()
    obj = PropertyType.objects.filter(name__iexact=normalized).first()
    if obj:
        return obj
    return PropertyType.objects.create(name=normalized)


def _resolve_deal(name: str | None) -> DealType | None:
    if not name or not name.strip():
        return None
    normalized = name.strip()
    obj = DealType.objects.filter(name__iexact=normalized).first()
    if obj:
        return obj
    return DealType.objects.create(name=normalized)


def _download_image(url: str, timeout: int = 10) -> bytes | None:
    try:
        response = requests.get(url, timeout=timeout, verify=False)
        response.raise_for_status()
        return response.content
    except requests.RequestException:
        return None


def _convert_to_webp(image_bytes: bytes, filename: str) -> ContentFile | None:
    try:
        img = PILImage.open(BytesIO(image_bytes))
        max_width = 1280
        if img.width > max_width:
            height = int((max_width / img.width) * img.height)
            img = img.resize((max_width, height), PILImage.LANCZOS)
        img = img.convert("RGB")
        buffer = BytesIO()
        img.save(buffer, format="WEBP", quality=70, method=6)
        webp_name = filename.rsplit(".", 1)[0] + ".webp" if "." in filename else f"{filename}.webp"
        return ContentFile(buffer.getvalue(), name=webp_name)
    except Exception:
        return None


def _extract_crm_images(item: dict) -> list[str]:
    images = []
    images_data = item.get("images")
    if isinstance(images_data, list):
        for img in images_data:
            if isinstance(img, dict):
                watermark_url = img.get("watermarkFileUrl")
                if watermark_url and isinstance(watermark_url, str) and watermark_url.startswith("http"):
                    images.append(watermark_url)
                else:
                    file_url = img.get("fileUrl")
                    if file_url and isinstance(file_url, str) and file_url.startswith("http"):
                        images.append(file_url)
    
    if not images:
        preview = item.get("preview")
        if isinstance(preview, str) and preview.startswith("http"):
            images.append(preview)
    
    return images


def _text_to_html(text: str) -> str:
    """Convert plain text with newlines to HTML paragraphs."""
    if not text or not text.strip():
        return ""

    import re

    text = text.strip()

    paragraphs = re.split(r'\r?\n\r?\n+', text)

    html_parts = []
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        lines = re.split(r'\r?\n', para)
        lines = [line.strip() for line in lines]
        lines = [line for line in lines if line]

        if lines:
            html_parts.append('<p>' + '<br>'.join(lines) + '</p>')

    html = ''.join(html_parts)

    return sanitize_rich_text(html)


def _map_crm_item_to_property(item: dict) -> dict:
    realty_type_id = str(item.get("realty_type") or "")
    deal_id = str(item.get("deal") or "")

    price = _safe_decimal(item.get("price"))
    if price is None:
        price = _safe_decimal(item.get("price_per_object"))
    if price is None:
        price = Decimal("0")

    area = _safe_int(item.get("area_total") or item.get("area"))
    rooms = _safe_int(item.get("room_count") or item.get("rooms"))

    title = (
        item.get("name")
        or item.get("title")
        or item.get("pdf_title")
        or ""
    ).strip()
    if not title:
        type_name = REALTY_TYPE_MAP.get(realty_type_id, "Об'єкт")
        address_parts = _build_address_parts(item)
        title = f"{type_name} — {', '.join(address_parts)}" if address_parts else type_name

    address_parts = _build_address_parts(item)
    address = ", ".join(address_parts) if address_parts else "Не вказано"

    description = _text_to_html(
        item.get("description")
        or item.get("feed_text")
        or ""
    )

    latitude = _safe_float(item.get("map_lat"))
    longitude = _safe_float(item.get("map_lng"))

    currency_code = CURRENCY_MAP.get(str(item.get("price_currency_id") or ""), "USD")

    property_type_name = REALTY_TYPE_MAP.get(realty_type_id)
    deal_type_name = DEAL_TYPE_MAP.get(deal_id)

    images = _extract_crm_images(item)

    client_id = _safe_int(item.get("client_id"))

    return {
        "title": title[:255],
        "description": description[:4569],
        "address": address[:255],
        "price": price,
        "area": area or 1,
        "rooms": rooms or 1,
        "latitude": latitude,
        "longitude": longitude,
        "property_type_name": property_type_name,
        "deal_type_name": deal_type_name,
        "price_currency": currency_code,
        "images": images,
        "client_id": client_id,
    }


def _safe_float(value) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _build_address_parts(item: dict) -> list[str]:
    parts = []
    street = str(item.get("street_name") or "").strip()
    house_num = str(item.get("house_num") or "").strip()
    apartment = str(item.get("apartment") or "").strip()

    if street:
        addr = street
        if house_num:
            addr = f"{street}, {house_num}"
        if apartment:
            addr = f"{addr}, кв. {apartment}"
        parts.append(addr)

    return parts


def _extract_crm_items_images(item: dict) -> list[str]:
    return _extract_crm_images(item)


def _sync_client(raw_item: dict, crm_client, stdout, dry_run: bool = False) -> "Client | None":
    client_crm_id = _safe_int(raw_item.get("client_id"))
    if not client_crm_id:
        return None

    if dry_run:
        return None

    client_obj, created = Client.objects.get_or_create(
        crm_id=client_crm_id,
        defaults={
            "crm_url": f"https://crm-dominium.realtsoft.net/client/{client_crm_id}",
            "raw_data": raw_item,
        },
    )

    if created or not client_obj.name:
        try:
            response = crm_client.call("client/index", {"id": str(client_crm_id)})
            clients = response if isinstance(response, list) else response.get("data") or []
            matched = [c for c in clients if c.get("id") == client_crm_id]
            if matched:
                c = matched[0]
                client_obj.name = c.get("name") or ""
                phones = c.get("phones") or []
                client_obj.phone = phones[0] if phones else ""
                client_obj.email = c.get("email") or ""
                client_obj.raw_data = c
                client_obj.save(update_fields=["name", "phone", "email", "raw_data"])
                if created:
                    stdout.write(f"    Новий клієнт: CRM#{client_crm_id} — {client_obj.name}")
        except Exception:
            pass

    return client_obj


class Command(BaseCommand):
    help = "Синхронізація об'єктів нерухомості з Realtsoft CRM"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Показати що буде зроблено без реальних змін.",
        )
        parser.add_argument(
            "--per-page",
            type=int,
            default=getattr(settings, "REALTSOFT_DEFAULT_PER_PAGE", 150),
            help="Кількість об'єктів на сторінку (макс. 150).",
        )
        parser.add_argument(
            "--max-pages",
            type=int,
            default=0,
            help="Макс. кількість сторінок (0 = без обмежень).",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        per_page = min(options["per_page"], 150)
        max_pages = options["max_pages"]

        if not getattr(settings, "REALTSOFT_SYNC_ENABLED", False) and not dry_run:
            self.stderr.write(self.style.WARNING("REALTSOFT_SYNC_ENABLED=0. Sync зупинено."))
            return

        try:
            client = get_realtsoft_client()
        except RealtsoftAPIError as exc:
            raise CommandError(str(exc))

        self.stdout.write(self.style.HTTP_INFO("Починаю sync з Realtsoft CRM..."))

        created_count = 0
        updated_count = 0
        unchanged_count = 0
        error_count = 0
        page = 1
        total_fetched = 0

        while True:
            if max_pages and page > max_pages:
                break

            try:
                response = client.search_estate(page=page, per_page=per_page)
            except RealtsoftAPIError as exc:
                self.stderr.write(self.style.ERROR(f"Помилка API на сторінці {page}: {exc}"))
                error_count += 1
                break

            items = response if isinstance(response, list) else response.get("data") or response.get("items") or []

            if not items:
                break

            self.stdout.write(f"  Сторінка {page}: {len(items)} об'єктів")

            for item in items:
                crm_id = item.get("id")
                if crm_id is None:
                    continue

                try:
                    result = self._sync_single_item(client, item, dry_run)
                    if result == "created":
                        created_count += 1
                    elif result == "updated":
                        updated_count += 1
                    elif result == "unchanged":
                        unchanged_count += 1
                except Exception as exc:
                    error_count += 1
                    self.stderr.write(
                        self.style.ERROR(f"  Помилка для CRM ID {crm_id}: {exc}")
                    )
                    logger.exception("Sync error for CRM ID %s", crm_id)

            total_fetched += len(items)

            if len(items) == 0:
                break

            page += 1

        summary = (
            f"\nSync завершено: отримано {total_fetched}, "
            f"створено {created_count}, оновлено {updated_count}, "
            f"без змін {unchanged_count}, помилок {error_count}"
        )

        if dry_run:
            summary = f"[DRY RUN] {summary}"

        self.stdout.write(self.style.SUCCESS(summary))

    def _sync_single_item(self, client, item: dict, dry_run: bool) -> str:
        crm_id = int(item["id"])
        mapped = _map_crm_item_to_property(item)

        existing_ext = (
            ExternalProperty.objects.select_related("property")
            .filter(crm_property_id=crm_id, source="realtsoft")
            .first()
        )

        if existing_ext:
            return self._update_existing(existing_ext, mapped, item, dry_run)
        else:
            crm_url = f"{client.url}/estate/{crm_id}"
            return self._create_new(crm_id, mapped, item, dry_run, crm_url)

    def _create_new(self, crm_id: int, mapped: dict, raw_item: dict, dry_run: bool, crm_url: str = "") -> str:
        if dry_run:
            self.stdout.write(f"  [DRY RUN] Створю: CRM#{crm_id} — {mapped['title'][:60]}")
            return "created"

        with transaction.atomic():
            property_type = _resolve_type(mapped["property_type_name"])
            deal_type = _resolve_deal(mapped["deal_type_name"])
            client = _sync_client(raw_item, client, self.stdout, dry_run)

            property_obj = Property(
                title=mapped["title"],
                description=mapped["description"],
                address=mapped["address"],
                price=mapped["price"],
                area=mapped["area"],
                rooms=mapped["rooms"],
                latitude=mapped["latitude"],
                longitude=mapped["longitude"],
                property_type=property_type,
                deal_type=deal_type,
                price_currency=mapped["price_currency"],
                external_source="realtsoft",
                external_id=str(crm_id),
                client=client,
            )
            property_obj.save()

            ExternalProperty.objects.create(
                crm_property_id=crm_id,
                property=property_obj,
                crm_url=crm_url,
                raw_data=raw_item,
                sync_status="synced",
                source="realtsoft",
            )

            self._sync_images(property_obj, mapped["images"], dry_run)

        self.stdout.write(f"  Створено: CRM#{crm_id} — {mapped['title'][:60]}")
        return "created"

    def _update_existing(self, ext: ExternalProperty, mapped: dict, raw_item: dict, dry_run: bool) -> str:
        property_obj = ext.property

        changed = False
        fields_to_check = {
            "title": mapped["title"],
            "description": mapped["description"],
            "address": mapped["address"],
            "price": mapped["price"],
            "area": mapped["area"],
            "rooms": mapped["rooms"],
            "latitude": mapped["latitude"],
            "longitude": mapped["longitude"],
            "price_currency": mapped["price_currency"],
        }

        for field, new_value in fields_to_check.items():
            current_value = getattr(property_obj, field)
            if current_value != new_value:
                setattr(property_obj, field, new_value)
                changed = True

        new_type = _resolve_type(mapped["property_type_name"])
        if new_type and property_obj.property_type_id != new_type.id:
            property_obj.property_type = new_type
            changed = True

        new_deal = _resolve_deal(mapped["deal_type_name"])
        if new_deal and property_obj.deal_type_id != new_deal.id:
            property_obj.deal_type = new_deal
            changed = True

        if property_obj.external_source != "realtsoft":
            property_obj.external_source = "realtsoft"
            changed = True
        if property_obj.external_id != str(ext.crm_property_id):
            property_obj.external_id = str(ext.crm_property_id)
            changed = True

        if dry_run:
            if changed:
                self.stdout.write(f"  [DRY RUN] Оновлю: CRM#{ext.crm_property_id} — {mapped['title'][:60]}")
                return "updated"
            return "unchanged"

        if changed:
            property_obj.save()

        ext.raw_data = raw_item
        ext.sync_status = "synced"
        ext.save(update_fields=["raw_data", "sync_status", "last_synced"])

        has_images = PropertyImage.objects.filter(property=property_obj).exists()
        needs_images = not has_images or PropertyImage.objects.filter(property=property_obj).count() < len(mapped.get("images", []))
        
        if needs_images:
            self._sync_images(property_obj, mapped["images"], dry_run=False)

        if changed:
            self.stdout.write(f"  Оновлено: CRM#{ext.crm_property_id} — {mapped['title'][:60]}")
            return "updated"

        return "unchanged"

    def _sync_images(self, property_obj: Property, image_urls: list[str], dry_run: bool):
        if dry_run or not image_urls:
            return

        existing_images = set(
            PropertyImage.objects.filter(property=property_obj).values_list("image", flat=True)
        )

        existing_count = len(existing_images)

        downloaded = 0
        for idx, url in enumerate(image_urls[:20]):
            image_bytes = _download_image(url, timeout=10)
            if not image_bytes:
                continue

            webp_content = _convert_to_webp(image_bytes, f"crm_{property_obj.id}_{idx}")
            if not webp_content:
                continue

            if webp_content.name in existing_images:
                continue

            is_main = idx == 0 and existing_count == 0
            PropertyImage.objects.create(
                property=property_obj,
                image=webp_content,
                is_main=is_main,
                sort_order=existing_count + idx + 1,
            )
            downloaded += 1

        if downloaded:
            self.stdout.write(f"    Завантажено {downloaded} зображень")

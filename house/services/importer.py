import os
from urllib.parse import urlparse

import requests
from django.conf import settings
from django.core.files.base import ContentFile
from django.utils.text import slugify

from house.models import DealType, Property, PropertyImage, PropertyType
from house.utils.html_parser import parse_property_html


class PropertyImportError(Exception):
    """Базова помилка імпорту нерухомості."""


class InvalidImportURL(PropertyImportError):
    """URL не валідний або відсутній."""


def is_valid_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        return parsed.scheme in ("http", "https") and parsed.netloc
    except ValueError:
        return False


def _generate_unique_slug_for_property_type(name: str) -> str:
    base_slug = slugify(name)
    slug = base_slug or "property-type"
    counter = 1
    while PropertyType.objects.filter(slug=slug).exists():
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug


def _resolve_property_type(name: str | None) -> PropertyType | None:
    if not name:
        return None
    property_type, created = PropertyType.objects.get_or_create(name=name)
    if created or not property_type.slug:
        property_type.slug = _generate_unique_slug_for_property_type(property_type.name)
        property_type.save(update_fields=["slug"])
    return property_type


def _resolve_deal_type(name: str | None) -> DealType | None:
    if not name:
        return None
    deal_type, _ = DealType.objects.get_or_create(name=name)
    return deal_type


def _safe_int(value, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _import_images(property_obj: Property, data: dict, *, timeout: int) -> list[str]:
    warnings: list[str] = []
    image_pairs: list[tuple[str, bool]] = []

    main_image = data.get("main_image")
    if main_image:
        image_pairs.append((main_image, True))
    for url in data.get("gallery") or []:
        image_pairs.append((url, False))

    has_main = property_obj.images.filter(is_main=True).exists()

    for index, (image_url, wants_main) in enumerate(image_pairs):
        if not image_url:
            continue
        try:
            response = requests.get(image_url, timeout=timeout)
            response.raise_for_status()
        except requests.RequestException as exc:
            warnings.append(f"{image_url}: {exc}")
            continue

        filename = os.path.basename(urlparse(image_url).path) or f"image-{index}.jpg"
        if not os.path.splitext(filename)[1]:
            filename += ".jpg"

        try:
            image_file = ContentFile(response.content, name=filename)
            PropertyImage.objects.create(
                property=property_obj,
                image=image_file,
                is_main=wants_main and not has_main,
            )
            if wants_main and not has_main:
                has_main = True
        except Exception as exc:
            warnings.append(f"{image_url}: {exc}")

    return warnings


def import_property_from_url(url: str, *, timeout: int | None = None):
    if not url or not is_valid_url(url):
        raise InvalidImportURL("Некоректна URL-адреса")

    resolved_timeout = timeout or getattr(settings, "REQUESTS_TIMEOUT", 10)
    response = requests.get(url, timeout=resolved_timeout)
    response.raise_for_status()

    parsed = parse_property_html(response.text, source=url).as_dict()
    property_type = _resolve_property_type(parsed.get("property_type"))
    deal_type = _resolve_deal_type(parsed.get("deal_type"))

    property_obj = Property(
        title=parsed.get("title") or "",
        address=parsed.get("address") or "",
        price=parsed.get("price"),
        area=_safe_int(parsed.get("area")),
        rooms=_safe_int(parsed.get("rooms"), default=1),
        description=parsed.get("description_html") or "",
        property_type=property_type,
        deal_type=deal_type,
        latitude=parsed.get("latitude"),
        longitude=parsed.get("longitude"),
    )
    property_obj.save()
    property_obj.save()

    warnings = _import_images(property_obj, parsed, timeout=resolved_timeout)

    return property_obj, warnings

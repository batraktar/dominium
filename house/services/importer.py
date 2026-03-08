import hashlib
import os
from io import BytesIO

import requests
from django.conf import settings
from django.core.files.base import ContentFile
from django.utils.text import slugify
from PIL import Image

from house.models import DealType, Property, PropertyImage, PropertyType
from house.utils.image_selection import build_import_image_pairs, image_url_quality_score
from house.utils.html_parser import parse_property_html
from house.utils.network_security import (
    ImportContentTypeError,
    ImportPayloadTooLargeError,
    UnsafeImportURLError,
    ensure_safe_import_url,
    fetch_import_html,
    fetch_import_image,
)
from house.utils.sanitization import sanitize_rich_text


class PropertyImportError(Exception):
    """Базова помилка імпорту нерухомості."""


class InvalidImportURL(PropertyImportError):
    """URL не валідний або відсутній."""


def is_valid_url(url: str) -> bool:
    try:
        ensure_safe_import_url(url)
        return True
    except (ValueError, UnsafeImportURLError):
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
    normalized = (name or "").strip()
    if not normalized:
        return None
    property_type = PropertyType.objects.filter(name__iexact=normalized).first()
    created = property_type is None
    if property_type is None:
        property_type = PropertyType.objects.create(name=normalized)
    if created or not property_type.slug:
        property_type.slug = _generate_unique_slug_for_property_type(property_type.name)
        property_type.save(update_fields=["slug"])
    return property_type


def _resolve_deal_type(name: str | None) -> DealType | None:
    normalized = (name or "").strip()
    if not normalized:
        return None
    deal_type = DealType.objects.filter(name__iexact=normalized).first()
    if deal_type is None:
        deal_type = DealType.objects.create(name=normalized)
    return deal_type


def _safe_int(value, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _compute_dhash(image_bytes: bytes) -> int | None:
    """Compute compact perceptual hash for near-duplicate detection."""
    try:
        with Image.open(BytesIO(image_bytes)) as image:
            grayscale = image.convert("L").resize((9, 8), Image.Resampling.LANCZOS)
            pixels = list(grayscale.tobytes())
    except Exception:
        return None

    hash_value = 0
    for y in range(8):
        row_offset = y * 9
        for x in range(8):
            left = pixels[row_offset + x]
            right = pixels[row_offset + x + 1]
            hash_value <<= 1
            if left > right:
                hash_value |= 1
    return hash_value


def _hamming_distance(left: int, right: int) -> int:
    return (left ^ right).bit_count()


def _is_visual_duplicate(
    candidate_hash: int | None,
    existing_hashes: list[int],
    *,
    threshold: int,
) -> bool:
    if candidate_hash is None:
        return False
    return any(
        _hamming_distance(candidate_hash, existing_hash) <= threshold
        for existing_hash in existing_hashes
    )


def _import_images(property_obj: Property, data: dict, *, timeout: int) -> list[str]:
    warnings: list[str] = []
    image_pairs = build_import_image_pairs(
        data.get("main_image"),
        data.get("gallery") or [],
    )
    image_pairs = sorted(
        image_pairs,
        key=lambda pair: image_url_quality_score(pair[0]),
        reverse=True,
    )

    has_main = property_obj.images.filter(is_main=True).exists()
    seen_hashes: set[str] = set()
    seen_visual_hashes: list[int] = []
    created_images: list[PropertyImage] = []
    visual_threshold = max(
        0,
        int(getattr(settings, "IMPORT_IMAGE_PHASH_THRESHOLD", 4) or 0),
    )
    should_detect_visual_duplicates = visual_threshold > 0

    for index, (image_url, wants_main) in enumerate(image_pairs, start=1):
        if not image_url:
            continue
        try:
            image_bytes = fetch_import_image(image_url, timeout=timeout)
        except (
            requests.RequestException,
            UnsafeImportURLError,
            ImportPayloadTooLargeError,
            ImportContentTypeError,
            ValueError,
        ) as exc:
            warnings.append(f"{image_url}: {exc}")
            continue

        filename = os.path.basename(image_url.split("?", 1)[0]) or f"image-{index}.jpg"
        if not os.path.splitext(filename)[1]:
            filename += ".jpg"

        try:
            content_hash = hashlib.sha256(image_bytes).hexdigest()
            if content_hash in seen_hashes:
                continue
            seen_hashes.add(content_hash)

            visual_hash = _compute_dhash(image_bytes)
            if should_detect_visual_duplicates and _is_visual_duplicate(
                visual_hash,
                seen_visual_hashes,
                threshold=visual_threshold,
            ):
                continue
            if visual_hash is not None:
                seen_visual_hashes.append(visual_hash)

            image_file = ContentFile(image_bytes, name=filename)
            image_obj = PropertyImage.objects.create(
                property=property_obj,
                image=image_file,
                is_main=wants_main and not has_main,
            )
            created_images.append(image_obj)
            if wants_main and not has_main:
                has_main = True
        except Exception as exc:
            warnings.append(f"{image_url}: {exc}")

    if not has_main and created_images:
        created_images[0].is_main = True
        created_images[0].save(update_fields=["is_main"])

    return warnings


def import_images_from_parsed(
    property_obj: Property,
    data: dict,
    *,
    timeout: int | None = None,
) -> list[str]:
    resolved_timeout = timeout or getattr(settings, "REQUESTS_TIMEOUT", 10)
    return _import_images(property_obj, data, timeout=resolved_timeout)


def import_property_from_url(
    url: str,
    *,
    timeout: int | None = None,
    geocode_missing: bool = False,
):
    if not url:
        raise InvalidImportURL("Некоректна URL-адреса")

    try:
        safe_url = ensure_safe_import_url(url)
    except UnsafeImportURLError as exc:
        raise InvalidImportURL(str(exc)) from exc

    resolved_timeout = timeout or getattr(settings, "REQUESTS_TIMEOUT", 10)
    html, resolved_url = fetch_import_html(safe_url, timeout=resolved_timeout)

    parsed = parse_property_html(
        html,
        source=resolved_url,
        geocode_missing=geocode_missing,
    ).as_dict()
    property_type = _resolve_property_type(parsed.get("property_type"))
    deal_type = _resolve_deal_type(parsed.get("deal_type"))

    property_obj = Property(
        title=parsed.get("title") or "",
        address=parsed.get("address") or "",
        price=parsed.get("price"),
        area=_safe_int(parsed.get("area")),
        rooms=_safe_int(parsed.get("rooms"), default=1),
        description=sanitize_rich_text(parsed.get("description_html") or ""),
        property_type=property_type,
        deal_type=deal_type,
        latitude=parsed.get("latitude"),
        longitude=parsed.get("longitude"),
    )
    property_obj.save()

    warnings = import_images_from_parsed(property_obj, parsed, timeout=resolved_timeout)

    return property_obj, warnings

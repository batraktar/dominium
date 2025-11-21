from __future__ import annotations

from dataclasses import dataclass
from typing import Any


def _absolute_url(request, relative_url: str | None) -> str | None:
    if not relative_url or not request:
        return relative_url
    return request.build_absolute_uri(relative_url)


@dataclass
class PriceInfoSerializer:
    amount: float | None
    currency: str = "USD"

    def as_dict(self) -> dict[str, Any]:
        return {"amount": self.amount, "currency": self.currency}


@dataclass
class LocationSerializer:
    address: str | None
    latitude: float | None
    longitude: float | None

    def as_dict(self) -> dict[str, Any]:
        return {
            "address": self.address,
            "latitude": self.latitude,
            "longitude": self.longitude,
        }


def serialize_type(type_obj) -> dict | None:
    if not type_obj:
        return None
    return {
        "id": type_obj.id,
        "name": type_obj.name,
        "slug": getattr(type_obj, "slug", None),
    }


def serialize_deal(deal_obj) -> dict | None:
    if not deal_obj:
        return None
    return {"id": deal_obj.id, "name": deal_obj.name}


def serialize_feature(feature_obj) -> dict:
    return {"id": feature_obj.id, "name": feature_obj.name}


def serialize_image(image_obj, request=None) -> dict:
    return {
        "id": image_obj.id,
        "url": _absolute_url(request, image_obj.image.url),
        "is_main": image_obj.is_main,
    }


def serialize_property(property_obj, request=None) -> dict:
    images = [serialize_image(image, request) for image in property_obj.images.all()]
    main_image_url = next(
        (image["url"] for image in images if image["is_main"]),
        images[0]["url"] if images else None,
    )
    price_amount = float(property_obj.price) if property_obj.price is not None else None

    return {
        "id": property_obj.id,
        "title": property_obj.title,
        "slug": property_obj.slug,
        "description": property_obj.description,
        "address": property_obj.address,
        "latitude": property_obj.latitude,
        "longitude": property_obj.longitude,
        "location": LocationSerializer(
            address=property_obj.address,
            latitude=property_obj.latitude,
            longitude=property_obj.longitude,
        ).as_dict(),
        "price": price_amount,
        "price_info": PriceInfoSerializer(amount=price_amount).as_dict(),
        "area": property_obj.area,
        "rooms": property_obj.rooms,
        "created_at": (
            property_obj.created_at.isoformat() if property_obj.created_at else None
        ),
        "is_archived": property_obj.is_archived,
        "featured_homepage": property_obj.featured_homepage,
        "property_type": serialize_type(property_obj.property_type),
        "deal_type": serialize_deal(property_obj.deal_type),
        "features": [
            serialize_feature(feature) for feature in property_obj.features.all()
        ],
        "images": images,
        "main_image": {"url": main_image_url} if main_image_url else None,
        "absolute_url": (
            _absolute_url(request, property_obj.get_absolute_url())
            if hasattr(property_obj, "get_absolute_url")
            else None
        ),
    }

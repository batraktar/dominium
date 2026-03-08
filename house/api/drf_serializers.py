from __future__ import annotations

from django.utils.html import strip_tags
from rest_framework import serializers

from house.models import DealType, Feature, HomepageHighlightSettings, Property, PropertyType
from house.utils.sanitization import sanitize_rich_text


class PropertyWriteSerializer(serializers.ModelSerializer):
    property_type_id = serializers.PrimaryKeyRelatedField(
        source="property_type",
        queryset=PropertyType.objects.all(),
        required=False,
        allow_null=True,
    )
    deal_type_id = serializers.PrimaryKeyRelatedField(
        source="deal_type",
        queryset=DealType.objects.all(),
        required=False,
        allow_null=True,
    )
    feature_ids = serializers.PrimaryKeyRelatedField(
        source="features",
        queryset=Feature.objects.all(),
        many=True,
        required=False,
    )

    class Meta:
        model = Property
        fields = (
            "title",
            "description",
            "address",
            "price",
            "area",
            "rooms",
            "latitude",
            "longitude",
            "featured_homepage",
            "is_archived",
            "property_type_id",
            "deal_type_id",
            "feature_ids",
        )
        extra_kwargs = {
            "description": {"required": False, "allow_blank": True},
            "latitude": {"required": False, "allow_null": True},
            "longitude": {"required": False, "allow_null": True},
            "featured_homepage": {"required": False},
            "is_archived": {"required": False},
        }

    def validate_title(self, value: str) -> str:
        normalized = strip_tags(value or "").strip()
        if not normalized:
            raise serializers.ValidationError("Назва обов'язкова.")
        return normalized

    def validate_address(self, value: str) -> str:
        normalized = strip_tags(value or "").strip()
        if not normalized:
            raise serializers.ValidationError("Адреса обов'язкова.")
        return normalized

    def validate_description(self, value: str) -> str:
        cleaned_html = sanitize_rich_text(value or "")
        if len(strip_tags(cleaned_html)) > 4000:
            raise serializers.ValidationError("Опис не може перевищувати 4000 символів.")
        return cleaned_html

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Ціна має бути більшою за 0.")
        return value

    def validate_latitude(self, value):
        if value is None:
            return value
        if not (-90 <= value <= 90):
            raise serializers.ValidationError("Широта повинна бути в межах від -90 до 90.")
        return value

    def validate_longitude(self, value):
        if value is None:
            return value
        if not (-180 <= value <= 180):
            raise serializers.ValidationError(
                "Довгота повинна бути в межах від -180 до 180."
            )
        return value

    def validate_area(self, value: int) -> int:
        if value <= 0:
            raise serializers.ValidationError("Площа має бути більшою за 0.")
        if value > 100000:
            raise serializers.ValidationError("Площа виглядає некоректною.")
        return value

    def validate_rooms(self, value: int) -> int:
        if value <= 0:
            raise serializers.ValidationError("Кількість кімнат має бути більшою за 0.")
        if value > 100:
            raise serializers.ValidationError("Кількість кімнат виглядає некоректною.")
        return value

    def validate_feature_ids(self, value):
        # Keep order deterministic and drop duplicates.
        unique = []
        seen_ids = set()
        for feature_obj in value:
            if feature_obj.pk not in seen_ids:
                unique.append(feature_obj)
                seen_ids.add(feature_obj.pk)
        return unique

    def create(self, validated_data):
        features = validated_data.pop("features", None)
        instance = Property.objects.create(**validated_data)
        if features is not None:
            instance.features.set(features)
        return instance

    def update(self, instance, validated_data):
        features = validated_data.pop("features", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if features is not None:
            instance.features.set(features)
        return instance


class HighlightSettingsWriteSerializer(serializers.ModelSerializer):
    property_type_ids = serializers.PrimaryKeyRelatedField(
        source="property_types",
        queryset=PropertyType.objects.all(),
        many=True,
        required=False,
    )

    class Meta:
        model = HomepageHighlightSettings
        fields = ("limit", "price_min", "price_max", "region_keyword", "property_type_ids")
        extra_kwargs = {
            "limit": {"min_value": 1, "max_value": 50, "required": False},
            "price_min": {"required": False, "allow_null": True},
            "price_max": {"required": False, "allow_null": True},
            "region_keyword": {"required": False, "allow_blank": True},
        }

    def validate_region_keyword(self, value: str) -> str:
        return strip_tags(value or "").strip()

    def validate_property_type_ids(self, value):
        unique = []
        seen_ids = set()
        for property_type in value:
            if property_type.pk not in seen_ids:
                unique.append(property_type)
                seen_ids.add(property_type.pk)
        return unique

    def validate(self, attrs):
        price_min = attrs.get(
            "price_min",
            self.instance.price_min if self.instance is not None else None,
        )
        price_max = attrs.get(
            "price_max",
            self.instance.price_max if self.instance is not None else None,
        )

        if (
            price_min is not None
            and price_max is not None
            and price_min > price_max
        ):
            raise serializers.ValidationError(
                {"price_max": "Максимальна ціна повинна бути більшою або рівною мінімальній."}
            )
        return attrs

    def create(self, validated_data):
        property_types = validated_data.pop("property_types", None)
        instance = HomepageHighlightSettings.objects.create(**validated_data)
        if property_types is not None:
            instance.property_types.set(property_types)
        return instance

    def update(self, instance, validated_data):
        property_types = validated_data.pop("property_types", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if property_types is not None:
            instance.property_types.set(property_types)
        return instance

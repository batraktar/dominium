from house.models import DealType, PropertyType


def resolve_property_type(name: str | None) -> PropertyType | None:
    if not name or not name.strip():
        return None
    normalized = name.strip()
    obj = PropertyType.objects.filter(name__iexact=normalized).first()
    if obj:
        return obj
    return PropertyType.objects.create(name=normalized)


def resolve_deal_type(name: str | None) -> DealType | None:
    if not name or not name.strip():
        return None
    normalized = name.strip()
    obj = DealType.objects.filter(name__iexact=normalized).first()
    if obj:
        return obj
    return DealType.objects.create(name=normalized)

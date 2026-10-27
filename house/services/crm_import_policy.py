from __future__ import annotations

from typing import Any

from house.models import AppSettings, ExternalProperty

DEFAULT_CRM_IMPORT_TAG = "реклама"


def get_crm_import_tag() -> str:
    crm_settings = AppSettings.get("crm", {})
    if not isinstance(crm_settings, dict):
        return DEFAULT_CRM_IMPORT_TAG
    return str(crm_settings.get("import_tag") or DEFAULT_CRM_IMPORT_TAG).strip()


def extract_crm_tags(item: dict[str, Any]) -> set[str]:
    tags: set[str] = set()
    tags_cache = item.get("tags_cache")
    if isinstance(tags_cache, str):
        tags.update(part.strip().casefold() for part in tags_cache.split(",") if part.strip())

    raw_tags = item.get("tags")
    if isinstance(raw_tags, list):
        for raw_tag in raw_tags:
            if isinstance(raw_tag, str):
                value = raw_tag
            elif isinstance(raw_tag, dict):
                value = raw_tag.get("name") or raw_tag.get("title") or raw_tag.get("label")
            else:
                value = ""
            if value:
                tags.add(str(value).strip().casefold())
    return tags


def has_crm_import_tag(item: dict[str, Any], required_tag: str | None = None) -> bool:
    normalized_tag = str(required_tag or get_crm_import_tag()).strip().casefold()
    return bool(normalized_tag) and normalized_tag in extract_crm_tags(item)


def refresh_crm_import_eligibility(required_tag: str | None = None) -> int:
    tag = required_tag or get_crm_import_tag()
    changed = 0
    for external in ExternalProperty.objects.filter(source="realtsoft").only(
        "id", "raw_data", "is_import_eligible"
    ):
        eligible = has_crm_import_tag(external.raw_data or {}, tag)
        if external.is_import_eligible != eligible:
            ExternalProperty.objects.filter(pk=external.pk).update(
                is_import_eligible=eligible
            )
            changed += 1
    return changed

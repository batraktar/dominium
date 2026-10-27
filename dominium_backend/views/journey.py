import json
import uuid
from collections import defaultdict
from urllib.parse import urlparse

from django.core.cache import cache
from django.db.models import Count
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from django.views.decorators.http import require_GET, require_POST

from house.models import Article, JourneyEvent, JourneySession, Property
from dominium_backend.views.common import get_client_ip


EVENT_TYPES = {choice[0] for choice in JourneyEvent.EVENT_TYPES}
ATTRIBUTION_FIELDS = {
    "referrer_host": 255,
    "utm_source": 100,
    "utm_medium": 100,
    "utm_campaign": 150,
    "utm_content": 150,
    "utm_term": 150,
}


def _local_path(value, *, required=False):
    value = str(value or "").strip()
    if not value and not required:
        return ""
    if not value.startswith("/") or value.startswith("//") or len(value) > 500:
        return None
    return value


@require_POST
def journey_event(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "invalid_json"}, status=400)

    try:
        event_id = uuid.UUID(str(payload.get("event_id", "")))
    except (ValueError, TypeError, AttributeError):
        return JsonResponse({"error": "invalid_event_id"}, status=400)

    session_id = str(payload.get("session_id", "")).strip()
    event_type = str(payload.get("event_type", "")).strip()
    path = _local_path(payload.get("path"), required=True)
    target_path = _local_path(payload.get("target_path"))
    if not session_id or len(session_id) > 64 or event_type not in EVENT_TYPES or path is None or target_path is None:
        return JsonResponse({"error": "invalid_event"}, status=400)

    rate_key = f"journey:{get_client_ip(request)}:{timezone.now():%Y%m%d%H%M}"
    try:
        count = cache.incr(rate_key)
    except ValueError:
        cache.set(rate_key, 1, 90)
        count = 1
    if count > 180:
        return JsonResponse({"error": "rate_limited"}, status=429)

    attribution = payload.get("attribution") if isinstance(payload.get("attribution"), dict) else {}
    session_defaults = {"first_path": path}
    for field, limit in ATTRIBUTION_FIELDS.items():
        value = str(attribution.get(field, "")).strip()[:limit]
        if field == "referrer_host" and value:
            value = (urlparse(value).hostname or value).lower()[:limit]
        session_defaults[field] = value
    session, _ = JourneySession.objects.get_or_create(session_id=session_id, defaults=session_defaults)
    if request.user.is_authenticated and session.user_id != request.user.id:
        JourneySession.objects.filter(pk=session.pk).update(user=request.user)

    property_obj = None
    article_obj = None
    if payload.get("property_id") not in (None, ""):
        property_obj = Property.objects.filter(pk=payload.get("property_id")).first()
        if property_obj is None:
            return JsonResponse({"error": "invalid_property"}, status=400)
    if payload.get("article_slug"):
        article_obj = Article.objects.filter(slug=payload.get("article_slug"), is_published=True).first()
        if article_obj is None:
            return JsonResponse({"error": "invalid_article"}, status=400)

    metadata = payload.get("metadata") if isinstance(payload.get("metadata"), dict) else {}
    safe_metadata = {}
    if event_type == "search":
        safe_metadata["query"] = str(metadata.get("query", "")).strip()[:120]

    _, created = JourneyEvent.objects.get_or_create(
        event_id=event_id,
        defaults={
            "session": session,
            "event_type": event_type,
            "path": path,
            "target_path": target_path,
            "property": property_obj,
            "article": article_obj,
            "metadata": safe_metadata,
        },
    )
    if created:
        JourneySession.objects.filter(pk=session.pk).update(last_seen_at=timezone.now())
    return JsonResponse({"status": "recorded" if created else "duplicate"}, status=201 if created else 200)


@require_GET
def journey_analytics(request):
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({"error": "forbidden"}, status=403)
    try:
        days = int(request.GET.get("period", "28"))
    except ValueError:
        days = 28
    if days not in {7, 28, 90}:
        return JsonResponse({"error": "unsupported_period"}, status=400)

    since = timezone.now() - timezone.timedelta(days=days)
    events = JourneyEvent.objects.filter(created_at__gte=since)
    sessions = JourneySession.objects.filter(events__created_at__gte=since).distinct()
    counts = dict(events.values_list("event_type").annotate(total=Count("id")))
    sources = list(
        sessions.values("utm_source", "utm_medium")
        .annotate(sessions=Count("id", distinct=True))
        .order_by("-sessions")[:10]
    )
    top_properties = list(
        events.filter(property__isnull=False)
        .values("property_id", "property__title", "property__slug")
        .annotate(events=Count("id"), visitors=Count("session_id", distinct=True))
        .order_by("-visitors", "-events")[:10]
    )
    recent_sessions = sessions.prefetch_related("events").order_by("-last_seen_at")[:20]
    journeys = []
    for session in recent_sessions:
        session_events = list(session.events.filter(created_at__gte=since).order_by("created_at")[:30])
        journeys.append({
            "session_id": session.session_id[-8:],
            "source": session.utm_source or session.referrer_host or "direct",
            "first_path": session.first_path,
            "last_seen_at": session.last_seen_at.isoformat(),
            "events": [{
                "type": event.event_type,
                "path": event.path,
                "target_path": event.target_path,
                "property_id": event.property_id,
                "created_at": event.created_at.isoformat(),
            } for event in session_events],
            "customer": {
                "user_id": session.user_id,
                "name": session.customer_name,
                "phone": session.customer_phone,
                "email": session.customer_email,
            },
        })

    return JsonResponse({
        "period": days,
        "overview": {
            "sessions": sessions.count(),
            "events": events.count(),
            "property_views": counts.get("property_view", 0),
            "intent": counts.get("favorite", 0) + counts.get("contact_click", 0),
            "consultations": counts.get("consultation", 0),
        },
        "events": counts,
        "sources": sources,
        "top_properties": top_properties,
        "journeys": journeys,
    })


@require_GET
def property_presentation(request, property_id):
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({"error": "forbidden"}, status=403)
    property_obj = get_object_or_404(
        Property.objects.prefetch_related("images", "features").select_related("property_type", "deal_type"),
        pk=property_id,
    )
    response = render(request, "admin/property_presentation.html", {"property": property_obj})
    response["X-Robots-Tag"] = "noindex, nofollow"
    response["Cache-Control"] = "private, no-store"
    return response

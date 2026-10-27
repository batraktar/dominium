import json
import html
import re
import uuid
from collections import defaultdict
from urllib.parse import urlparse

from django.core.cache import cache
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_GET, require_POST

from house.models import Article, JourneyEvent, JourneySession, Property
from dominium_backend.views.common import get_client_ip
from dominium_backend.services.property_presentation import build_property_presentation_pdf


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
    visitor_id = str(payload.get("visitor_id", "")).strip()
    tab_id = str(payload.get("tab_id", "")).strip()
    event_type = str(payload.get("event_type", "")).strip()
    path = _local_path(payload.get("path"), required=True)
    target_path = _local_path(payload.get("target_path"))
    if (not session_id or len(session_id) > 64 or len(visitor_id) > 64 or len(tab_id) > 64
            or event_type not in EVENT_TYPES or path is None or target_path is None):
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
    session_defaults = {
        "first_path": path,
        "visitor_id": visitor_id or session_id,
        "ip_address": get_client_ip(request) or None,
        "user_agent": request.headers.get("User-Agent", "")[:500],
    }
    for field, limit in ATTRIBUTION_FIELDS.items():
        value = str(attribution.get(field, "")).strip()[:limit]
        if field == "referrer_host" and value:
            value = (urlparse(value).hostname or value).lower()[:limit]
        session_defaults[field] = value
    session, session_created = JourneySession.objects.get_or_create(session_id=session_id, defaults=session_defaults)
    if not session_created:
        context_updates = []
        if not session.visitor_id:
            session.visitor_id = visitor_id or session_id
            context_updates.append("visitor_id")
        observed_ip = get_client_ip(request) or None
        if observed_ip and session.ip_address != observed_ip:
            session.ip_address = observed_ip
            context_updates.append("ip_address")
        observed_agent = request.headers.get("User-Agent", "")[:500]
        if observed_agent and session.user_agent != observed_agent:
            session.user_agent = observed_agent
            context_updates.append("user_agent")
        if context_updates:
            session.save(update_fields=context_updates)
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
    elif event_type in {"auth_start", "auth_success", "auth_failure"}:
        safe_metadata["provider"] = str(metadata.get("provider", "google")).strip()[:30]
        safe_metadata["reason"] = str(metadata.get("reason", "")).strip()[:80]

    _, created = JourneyEvent.objects.get_or_create(
        event_id=event_id,
        defaults={
            "session": session,
            "event_type": event_type,
            "tab_id": tab_id,
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
    visitors_count = (
        sessions.exclude(visitor_id="").values("visitor_id").distinct().count()
        + sessions.filter(visitor_id="").count()
    )
    counts = dict(events.values_list("event_type").annotate(total=Count("id")))
    funnel = [
        {"key": "sessions", "label": "Сесії", "value": sessions.count()},
        {
            "key": "property_view",
            "label": "Переглянули об’єкт",
            "value": events.filter(event_type="property_view").values("session_id").distinct().count(),
        },
        {
            "key": "intent",
            "label": "Виявили намір",
            "value": events.filter(event_type__in=("favorite", "contact_click")).values("session_id").distinct().count(),
        },
        {
            "key": "consultation",
            "label": "Залишили заявку",
            "value": events.filter(event_type="consultation").values("session_id").distinct().count(),
        },
    ]
    daily_rows = events.annotate(date=TruncDate("created_at")).values("date", "event_type").annotate(
        sessions=Count("session_id", distinct=True)
    )
    daily_by_date = defaultdict(lambda: {"sessions": set(), "property_views": 0, "consultations": 0})
    for event in events.annotate(date=TruncDate("created_at")).values("date", "event_type", "session_id"):
        bucket = daily_by_date[event["date"]]
        bucket["sessions"].add(event["session_id"])
    for row in daily_rows:
        if row["event_type"] == "property_view":
            daily_by_date[row["date"]]["property_views"] = row["sessions"]
        elif row["event_type"] == "consultation":
            daily_by_date[row["date"]]["consultations"] = row["sessions"]
    today = timezone.localdate()
    daily = []
    for offset in range(days - 1, -1, -1):
        date = today - timezone.timedelta(days=offset)
        bucket = daily_by_date[date]
        daily.append({
            "date": date.isoformat(),
            "sessions": len(bucket["sessions"]),
            "property_views": bucket["property_views"],
            "consultations": bucket["consultations"],
        })
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
    recent_sessions = sessions.select_related("user").prefetch_related("events").order_by("-last_seen_at")[:100]
    journeys = []
    for session in recent_sessions:
        session_events = list(session.events.filter(created_at__gte=since).order_by("created_at")[:30])
        journeys.append({
            "session_id": session.session_id[-8:],
            "visitor_id": session.visitor_id or session.session_id,
            "tab_count": len({event.tab_id for event in session_events if event.tab_id}),
            "ip_address": str(session.ip_address or ""),
            "user_agent": session.user_agent,
            "source": session.utm_source or session.referrer_host or "direct",
            "first_path": session.first_path,
            "last_seen_at": session.last_seen_at.isoformat(),
            "events": [{
                "type": event.event_type,
                "tab_id": event.tab_id[-8:] if event.tab_id else "",
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

    visitor_groups = {}
    for journey in journeys:
        key = journey["visitor_id"]
        group = visitor_groups.setdefault(key, {
            "visitor_id": key,
            "source": journey["source"],
            "first_path": journey["first_path"],
            "last_seen_at": journey["last_seen_at"],
            "visit_count": 0,
            "tab_count": 0,
            "ip_address": journey["ip_address"],
            "user_agent": journey["user_agent"],
            "customer": journey["customer"],
            "events": [],
        })
        group["visit_count"] += 1
        group["events"].extend(journey["events"])
        group["tab_count"] = len({event["tab_id"] for event in group["events"] if event["tab_id"]})
        if journey["last_seen_at"] > group["last_seen_at"]:
            group["last_seen_at"] = journey["last_seen_at"]
        if not group["customer"].get("name") and journey["customer"].get("name"):
            group["customer"] = journey["customer"]
    visitor_rows = sorted(visitor_groups.values(), key=lambda row: row["last_seen_at"], reverse=True)
    for row in visitor_rows:
        row["events"].sort(key=lambda event: event["created_at"])

    return JsonResponse({
        "period": days,
        "overview": {
            "visitors": visitors_count,
            "sessions": sessions.count(),
            "events": events.count(),
            "property_views": funnel[1]["value"],
            "intent": funnel[2]["value"],
            "consultations": funnel[3]["value"],
        },
        "events": counts,
        "funnel": funnel,
        "daily": daily,
        "sources": sources,
        "top_properties": top_properties,
        "journeys": journeys,
        "visitors": visitor_rows,
    })


def _presentation_property(slug):
    return get_object_or_404(
        Property.objects.prefetch_related("images", "features").select_related("property_type", "deal_type"),
        slug=slug,
    )


def _presentation_description(value):
    value = re.sub(r"(?i)<\s*br\s*/?\s*>", "\n", str(value or ""))
    value = re.sub(r"(?i)</\s*(p|div|li|h[1-6])\s*>", "\n", value)
    value = re.sub(r"<[^>]+>", "", value)
    return "\n".join(line.strip() for line in html.unescape(value).splitlines() if line.strip())


@require_GET
def property_presentation(request, slug):
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({"error": "forbidden"}, status=403)
    property_obj = _presentation_property(slug)
    response = render(request, "admin/property_presentation.html", {
        "property": property_obj,
        "description_text": _presentation_description(property_obj.description),
    })
    response["X-Robots-Tag"] = "noindex, nofollow"
    response["Cache-Control"] = "private, no-store"
    return response


@require_GET
def property_presentation_pdf(request, slug):
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({"error": "forbidden"}, status=403)
    property_obj = _presentation_property(slug)
    pdf = build_property_presentation_pdf(
        property_obj,
        description=_presentation_description(property_obj.description),
    )
    response = HttpResponse(pdf, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="dominium-{property_obj.slug}.pdf"'
    response["X-Robots-Tag"] = "noindex, nofollow"
    response["Cache-Control"] = "private, no-store"
    return response


@require_GET
def legacy_property_presentation(request, property_id):
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({"error": "forbidden"}, status=403)
    property_obj = get_object_or_404(Property, pk=property_id)
    return redirect("property_presentation", slug=property_obj.slug)

# DOMINIUM First-Party Analytics Design

## Intent

Give staff one truthful, interactive analytics workspace that explains acquisition, navigation, intent and conversion without confusing browser tabs with people or visits.

## Goals

- Separate a persistent anonymous visitor, a 30-minute visit, a browser tab and an individual event.
- Record server-observed IP and user agent staff-only; anonymize IP after 30 days.
- Track page/search/property/article/internal navigation, authentication attempts/results, favorites, contacts and consultations.
- Join anonymous history to an authenticated user or consultation identity without exposing it publicly.
- Merge journey, article and Google Search Console reporting into one Analytics surface while keeping article editing under Articles.
- Provide interactive period/source/event filters, trend tooltips, funnel drill-down and expandable visitor timelines.

## Non-goals

- Session replay, keystroke capture, arbitrary form payloads, cross-device fingerprinting or CRM replacement.
- External analytics infrastructure or new paid services.
- Public access to IP, contact details or staff analytics.

## Architecture

The browser stores `visitor_id` in localStorage, rotates `visit_id` after 30 minutes of inactivity, stores `tab_id` in sessionStorage and generates one `event_id` per action. Django validates the fixed event taxonomy, captures IP and user agent from the request, and stores events against a visit and visitor. Existing journey sessions are migrated compatibly and remain queryable.

The staff API returns summary metrics, a continuous time series, funnel stages, traffic sources, top content, path variants and paginated visitor timelines. Article aggregates and configured Search Console aggregates are returned in the same response. The React Analytics tab provides accessible charts with tooltips and visible tables, filters, drill-down and expandable event timelines.

## Privacy and retention

- Raw IP, user agent and customer identity are staff-only and never returned by public APIs.
- Raw IP is retained for 30 days, then replaced by a network-level anonymized value by a scheduled management command.
- Event metadata is allow-listed by event type; passwords, OAuth credentials, message text and arbitrary DOM content are rejected.
- Add a concise analytics disclosure to the privacy copy before broader marketing rollout.

## Approaches considered

- First-party Django analytics: selected because it preserves ownership, joins directly to applications and needs no new service.
- Self-hosted PostHog: richer replay/funnels but excessive operational and privacy cost for the current need.
- GA4/GSC-only: useful acquisition data but insufficient customer-level route reconstruction.

## Verification

Backend contract and retention tests, frontend model tests, React lint/tests/build, Django checks/tests, staff/non-staff API smoke and production browser QA of filters, tooltips and timelines.

# DOMINIUM First-Party Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one accurate, interactive staff analytics workspace across visits, tabs, journeys, articles and Google acquisition.

**Architecture:** Extend the existing Django journey models/API with visitor/visit/tab identity and server-observed context, then expose consolidated aggregates and detailed timelines. Replace the static React dashboard with filtered interactive components using the existing stack.

**Tech Stack:** Django, PostgreSQL, React 19, Ant Design 6, custom accessible SVG/CSS charts.

**Spec:** `docs/superpowers/specs/2026-10-28-first-party-analytics-design.md`

## Global Constraints

- Staff-only personal data; no public IP/contact leakage.
- Raw IP retention is 30 days; metadata remains allow-listed.
- Preserve existing JourneySession/JourneyEvent data and production-only files.
- Article authoring remains under Articles.

## Review Focus

- Multiple tabs share visitor and visit but retain distinct tab IDs and events.
- A visit rotates after 30 minutes while visitor identity remains stable.
- OAuth failures never include credentials or provider payloads.
- Non-staff cannot access consolidated analytics or personal context.
- Empty/sparse periods render accessible tables and controls without broken charts.

---

### Task 1: Identity and event contract

**Files:**
- Modify: `house/models.py`, `dominium_backend/views/journey.py`, `frontend-react/src/shared/analytics/journey.js`
- Create: `house/migrations/0017_analytics_identity.py`
- Test: `house/test_journey.py`, `frontend-react/src/shared/analytics/journey.test.js`

**Interfaces:**
- Produces: visitor/visit/tab IDs, server IP/UA and fixed event metadata.

- [ ] Write failing browser and Django contract tests.
- [ ] Run focused tests and confirm contract failures.
- [ ] Add compatible fields, validation, visit rotation and server context capture.
- [ ] Run focused tests green.

### Task 2: Consolidated staff analytics API

**Files:**
- Modify: `dominium_backend/views/journey.py`, `house/test_journey.py`
- Create: `house/management/commands/anonymize_journey_ips.py`

**Interfaces:**
- Consumes: Task 1 identities/events.
- Produces: overview, time series, funnel, sources, content, path variants and detailed visits.

- [ ] Write failing aggregation, staff-only and retention tests.
- [ ] Run focused backend tests red.
- [ ] Implement consolidated aggregation and anonymization command.
- [ ] Run focused backend tests green.

### Task 3: Interactive analytics workspace

**Files:**
- Modify: `frontend-react/src/features/admin/components/JourneyAnalyticsTab.jsx`, `frontend-react/src/features/admin/model/journeyAnalyticsModel.js`, admin CSS, `ArticlesTab.jsx`
- Test: `frontend-react/test/journey-analytics-model.test.js`

**Interfaces:**
- Consumes: Task 2 response.
- Produces: unified filtered dashboard and expandable visit timeline.

- [ ] Write failing dashboard model tests for filters, paths and conversions.
- [ ] Run frontend tests red.
- [ ] Implement interactive trend, funnel, filters, article/GSC sections and timelines.
- [ ] Run frontend tests, lint and production build green.
- [ ] Run Django checks/tests, runtime smoke, update project brain, commit, push and deploy exact SHA with rollback.

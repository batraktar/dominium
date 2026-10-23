# DOMINIUM Auth, Search Console, and Article Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver stable SPA authentication, a readonly Search Console dashboard, and safe staff article creation/import with editorial images.

**Architecture:** Django owns credential verification, sessions, Search Console access, imports, and image persistence. React consumes same-origin CSRF-protected JSON endpoints and never stores Google secrets. Existing allauth URLs remain fallback-only.

**Tech Stack:** Django 5.2, django-allauth, google-auth with requests transport, React/Vite, native fetch/FormData, Pillow.

**Spec:** `docs/superpowers/specs/2026-10-23-auth-search-console-article-import-design.md`

## Global Constraints

- Preserve existing users, sessions, articles, allauth routes, Django templates, CRM data, and unrelated dirty files.
- Service-account credentials remain environment-only and API errors must not expose secrets.
- Imported articles are always drafts and article content is rendered without arbitrary HTML.
- Published article details stay public/indexable; footer discovery is staff-only.

## Review Focus

- A verified Google email matching an existing account must reuse it without changing staff privileges or creating a duplicate.
- An invalid audience, unverified email, malformed credential, or missing client ID must fail without creating a session/user.
- Malformed/oversized import JSON, duplicate slug, HTML payloads, and attempted `is_published=true` must not bypass draft-only import.
- Missing/forbidden/quota-limited Search Console credentials must produce a safe staff-visible state and never a 500 with credential contents.
- Image uploads with invalid content/type/order must be rejected or normalized, while public responses preserve deterministic order and alt text.

---

### Task 1: Google credential session API

**Files:**
- Modify: `requirements.txt`, `dominium_backend/settings/base.py`, `dominium_backend/urls.py`, `dominium_backend/views/auth.py`
- Create: `accounts/services/google_identity.py`
- Test: `dominium_backend/tests_google_popup.py`, `dominium_backend/tests_api.py`

**Interfaces:**
- Produces: `verify_google_identity(credential: str) -> GoogleIdentity`; `POST /api/auth/google/`; `GET /api/auth/google-config/`.

- [ ] Add failing tests for configuration, valid credential login/new-user creation, existing-user reuse, invalid/unverified token rejection, duplicate prevention, CSRF, and session payload.
- [ ] Run focused tests and confirm failures come from missing interfaces.
- [ ] Add `google-auth[requests]`, environment-backed client ID, verifier service, and endpoints with rate limiting and safe errors.
- [ ] Run focused and full backend auth tests.
- [ ] Commit the focused auth backend change.

### Task 2: React Google Identity and unified session state

**Files:**
- Modify: `frontend-react/src/features/auth/`, `frontend-react/src/shared/hooks/dominium-ui/useDominiumModalEffects.js`, `frontend-react/src/shared/api/endpoints.js`, auth modal components/hooks
- Test: `frontend-react/test/`

**Interfaces:**
- Consumes: Task 1 Google config/login endpoints and existing session/login/logout endpoints.
- Produces: reusable Google Identity button loader and credential submission flow.

- [ ] Add failing Node tests for current-path retention, one-time GIS loading, credential POST, visible errors, and immediate session refresh after Google/password login and logout.
- [ ] Implement the minimal GIS button and unified auth state transitions; retain allauth fallback when GIS is unconfigured.
- [ ] Run frontend tests and lint.
- [ ] Commit the focused React auth change.

### Task 3: Search Console readonly service

**Files:**
- Create: `dominium_backend/services/search_console.py`, `dominium_backend/tests_search_console.py`
- Modify: `dominium_backend/settings/base.py`, `dominium_backend/urls.py`, `frontend-react/src/shared/api/endpoints.js`

**Interfaces:**
- Produces: `get_search_performance(period_days: int) -> dict`; staff-only `GET /api/admin/search-console/?period=7|28|90`.

- [ ] Add failing tests for service-account parsing, readonly scope, supported periods, caching, aggregate/daily/query/page payloads, incomplete-data metadata, and sanitized failure states.
- [ ] Implement REST calls through google-auth `AuthorizedSession`, short cache, date windows, and normalized response schema.
- [ ] Run focused and full backend tests.
- [ ] Commit the Search Console backend change.

### Task 4: Search Console admin dashboard

**Files:**
- Create: `frontend-react/src/features/admin/components/SearchConsoleTab.jsx`
- Modify: `frontend-react/src/features/admin/pages/AdminApiAdminPage.jsx`, `frontend-react/src/features/admin/pages/admin-api-admin.css`
- Test: `frontend-react/test/`

**Interfaces:**
- Consumes: Task 3 staff endpoint.

- [ ] Add failing UI/model tests for 7/28/90 periods, metrics, series, tables, incomplete-data notice, and safe configuration/error states.
- [ ] Implement the tab using existing admin visual primitives and accessible tables/period controls.
- [ ] Run frontend tests, lint, and build.
- [ ] Commit the Search Console dashboard.

### Task 5: Article images and safe import backend

**Files:**
- Modify: `house/models.py`, `dominium_backend/views/articles.py`, `dominium_backend/urls.py`, `dominium_backend/sitemaps.py`
- Create: `house/migrations/0011_articleimage.py`
- Test: `dominium_backend/tests_articles.py`

**Interfaces:**
- Produces: `ArticleImage`; ordered `images` in article serializers; `POST /api/admin/articles/import-preview/`; `POST /api/admin/articles/import/`.

- [ ] Add failing tests for ordered images/alt/captions, invalid uploads, draft/public visibility, staff permissions, strict import schema, duplicate slug, HTML stripping/rejection, size limits, and forced draft state.
- [ ] Implement the model/migration, image normalization, serializers, preview, and atomic draft import.
- [ ] Run migration checks and backend article/full tests.
- [ ] Commit the article backend change.

### Task 6: Article editor, prompt, import, images, and staff-only footer

**Files:**
- Modify: `frontend-react/src/features/admin/components/ArticlesTab.jsx`, public article pages, `frontend-react/src/features/layout/components/MainFooter.jsx`, shared auth/app state, styles
- Create: focused article import/prompt/image editor helpers/components
- Test: `frontend-react/test/`

**Interfaces:**
- Consumes: Task 5 article endpoints and auth session state.

- [ ] Add failing tests for staff-only footer discovery, public article image order/alt/caption, JSON paste/file preview, prompt schema, import errors, and draft result.
- [ ] Implement the import panel, copyable Ukrainian ChatGPT prompt, draft preview/save, multi-image upload/order/delete controls, and public safe rendering.
- [ ] Run frontend tests, lint, and build.
- [ ] Commit the article frontend change.

### Task 7: Documentation, integration verification, push, and deploy

**Files:**
- Modify: `.env.example`, production env example/docs, relevant project index only if its architecture map is tracked and safe to update, runtime/SEO smoke scripts if new routes require checks

**Interfaces:**
- Consumes: all prior tasks.

- [ ] Document Google GIS client ID, Search Console service-account JSON/property, readonly permission setup, and no-secret logging rules.
- [ ] Run React lint/tests/build, Django checks/migration check/full relevant tests, shell checks, and `git diff --check`.
- [ ] Run local browser scenarios for password/Google fallback, logout, staff/non-staff admin/footer, article import/images/draft/publish, and safe Search Console states.
- [ ] Commit only owned files; push exact SHA after all gates pass.
- [ ] Back up production DB/dist/config, fast-forward exact SHA, rebuild/apply migrations, install new dist, and verify actual live assets/API/runtime/SEO.
- [ ] Configure service-account credentials only when supplied through a secure server-side channel; otherwise deploy the explicit `not configured` dashboard state and provide the exact setup handoff.


# Remaining Frontend Migration (Without Landing)

## Context
- Goal: finish migration of UI/layout from Django templates to React SPA.
- Landing (`/`) залишається окремим legacy-виключенням.
- Django stays as backend/API/auth/business logic.
- Legacy templates are kept (no deletion), but must stop being runtime source for migrated screens.

## Current React Coverage
- `/` -> `HomeLandingContent` (already migrated)
- `/signup/` -> React `SignupRedirectPage` (redirect parity на `/?register=...`)
- `/search/` -> React `SearchPage`
- `/likes*` -> React `LikesPage`
- `/property/:slug/` -> React `PropertyDetailPage`
- `/test/map/interactive/` -> React `InteractiveMapPage`
- `/api/demo/` -> React `PropertyApiDemoPage`
- `/api/admin/` -> React `PropertyApiAdminPage`
- Unknown routes inside loaded SPA shell -> React `NotFoundPage`
- Global UI effects (modals/preloader/scroll/swiper/video) migrated into React hooks.
- Django runtime shell for migrated pages: `templates/react_spa.html`.
- SEO search subroutes are also on SPA shell runtime: `/search/region/<slug>/`, `/search/city/<slug>/` (scope filtering now goes through API query params `region_slug` / `city_slug`).

## Remaining UI To Migrate

### P1 (Next)
1. API admin component-level decomposition
- Поточний стан: `/api/admin` працює в React через `usePropertyApiAdminController` + `propertyAdminApi` (`apiClient`).
- Статус: виконано. Controller розбитий на модулі `features/admin/hooks/property-admin/*` (`table`, `form`, `images`, `import`, `highlight`) зі збереженням markup parity.
- Останній прогрес: додано edge-case hardening для `/api/admin` (abort-safe table loading, single-flight import, anti-double-submit для form actions, cleanup активних запитів).
- Наступна ціль: manual regression audit `/api/admin` (desktop/mobile) і фіксація залишкових UX edge-cases без зміни дизайну.

### P2
2. 404 backend fallback parity audit
- Django template: `templates/404.html`
- Legacy script: `static/base/assets/js/error_404.js`
- React SPA `NotFoundPage` is already added; keep Django `handler404` as non-SPA fallback.
- Останній прогрес: React `NotFoundPage` синхронізовано з legacy-текстами; backend `handler404` тепер повертає `noindex, nofollow` у meta та `X-Robots-Tag`.

3. Allauth social signup bridge page assessment
- Template: `templates/socialaccount/signup.html`
- Script: `static/base/assets/js/social_signup_bridge.js`
- Decision:
  - keep server-rendered as external auth callback page (recommended short-term; React modal auth bridge already handles popup success messages),
  - or migrate to tiny React route if full visual consistency is required.

## Legacy Templates/Assets to Mark as “No Longer Runtime Source” after migration
- `templates/search_filters.html` + `static/base/assets/js/search/*`
- `templates/likes.html`
- `templates/property_detail.html` + `static/base/assets/js/property_map.js`
- `templates/partials/*` used by those pages (cards/filters/gallery/auth modals)

Note:
- We keep files in repo (per constraint), but routing/runtime should use React screens.

## Runtime Switch Status
1. Done: route flags and page rendering in React for `/search/`, `/likes/`, `/property/:slug/`, `/api/demo/`, `/api/admin/`, `/test/map/interactive/`, `/signup/`.
2. Done: Django routes above now render SPA shell (`react_spa.html`) instead of legacy page templates, including `/search/region/<slug>/` and `/search/city/<slug>/`.
3. Done: Vite proxy excludes SPA UI routes from blanket `/api` proxying (`/api/demo`, `/api/admin`), and `/signup` is handled by SPA.
4. Keep backend endpoints unchanged; only UI rendering moved to React for migrated screens.
5. Build contract: before Django runtime checks/deploy, run `cd frontend-react && npm run build` to refresh `frontend-react/dist/.vite/manifest.json`.
6. Done: SEO hardening for SPA runtime (server-side `meta/canonical/og/twitter`, `X-Robots-Tag`, JSON-LD `WebSite + SearchAction`, `CollectionPage + BreadcrumbList`, `RealEstateListing` on property detail with OG image).
7. Done: додано SEO-аудит артефакти (`docs/seo/*`) + HTTP smoke script `scripts/seo_smoke_check.sh` для передрелізної перевірки.
8. Done: canonical-host hardening через `SEO_CANONICAL_HOST`/`SEO_CANONICAL_SCHEME` для SSR meta/schema, `robots.txt` і image sitemap URL.
9. Done: runtime-switch audit automation для мігрованих маршрутів — додано SPA marker (`meta[name='dominium-runtime-shell']`), backend smoke tests на відсутність legacy script-assets, окремий smoke script `scripts/runtime_switch_smoke_check.sh`.

## Proposed Execution Order
1. API admin manual regression audit (P1)
2. Runtime switch audit automation and verification (done)
3. Social signup bridge decision and optional migration (P2)

Manual checklist: `docs/migration/stage-24-runtime-switch-manual-checklist.md`

## Acceptance Checklist Per Migrated Screen
1. No visual regressions (desktop/mobile).
2. No new critical browser console errors.
3. No UI transitions to `127.*` or backend host pages.
4. All HTTP via `apiClient` (no raw `fetch` in feature code).
5. `npm run lint` and `npm run build` pass.

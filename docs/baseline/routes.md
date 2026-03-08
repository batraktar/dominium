# Baseline Routes Inventory

Snapshot date: 2026-02-17  
Environment target: React frontend + Django backend API/session

## 1) Frontend runtime routes (React)

Source of truth: `frontend-react/src/app/routing.js`, `frontend-react/src/app/components/AppMainContent.jsx`.

| Path pattern | Rendered React page/component | Notes |
| --- | --- | --- |
| `/` | `HomeLandingContent` | Landing залишається окремим сценарієм у межах SPA runtime. |
| `/signup/` | `SignupRedirectPage` | Redirect до `/?register=<method>&...`. |
| `/search*` | `SearchPage` | У React route-logic це `startsWith('/search')`; Django SPA shell покриває `/search/`, `/search/region/<slug>/`, `/search/city/<slug>/`. |
| `/likes*` | `LikesPage` | Auth-required flow через `dominium:auth-required`. |
| `/property/:slug/` | `PropertyDetailPage` | Дані через `/api/properties/by-slug/:slug/`. |
| `/test/map/interactive/` | `InteractiveMapPage` | Дані карти через `/test/map/interactive/data/`. |
| `/api/demo/` | `PropertyApiDemoPage` | API demo в React. |
| `/api/admin/` | `PropertyApiAdminPage` | Staff-only guard у React + backend 404 для non-staff. |
| unknown path | `NotFoundPage` | SPA fallback для невідомих маршрутів лише в межах вже завантаженого SPA shell. |

## 2) Django routes (server-side URL map)

Source of truth: `dominium_backend/urls.py`, `accounts/urls.py`, `house/api/urls.py`.

### Public/site routes
- `/` -> `public_views.base`
- `/search/` -> `spa_views.search_spa`
- `/search/region/<region_slug>/` -> `spa_views.search_region_spa`
- `/search/city/<city_slug>/` -> `spa_views.search_city_spa`
- `/property/<slug>/` -> `spa_views.property_detail_spa`
- `/likes/` -> `spa_views.likes_spa`
- `/signup/` -> `spa_views.signup_spa`
- `/api/demo/` -> `spa_views.property_api_demo_spa`
- `/api/admin/` -> `spa_views.property_api_admin_spa`
- `/test/map/interactive/` -> `spa_views.interactive_map_test_spa`
- `/test/map/interactive/data/` -> `public_views.interactive_map_test_data`
- `/consultation/` -> `public_views.consultation_view`
- `/like/<property_id>/` -> `auth_views.toggle_like`
- `/properties/<property_id>/toggle-featured/` -> `admin_views.toggle_featured_homepage`
- `/robots.txt`, `/sitemap.xml`, `/sitemap-images.xml`

### Auth routes (custom)
- `/login/` -> `accounts.login_view`
- `/logout/` -> `accounts.logout_view`
- `/register/email/` -> `accounts.register_email`
- `/register/telegram/` -> `accounts.register_via_telegram`
- `/activate/<uidb64>/<token>/` -> `accounts.activate`
- `/verify/<uuid>/` -> `accounts.verify_telegram_code`
- `/ajax/check-telegram/` -> username availability check

### API routes (prefix `/api/`)
- `/api/csrf/`
- `/api/properties/`
- `/api/properties/by-slug/<slug>/`
- `/api/properties/<id>/`
- `/api/property-types/`
- `/api/deal-types/`
- `/api/features/`
- `/api/liked-properties/`
- plus staff/import endpoints (`bulk-action`, images, import, highlight-settings, token endpoints)

## 3) Current ownership matrix

| Route class | Current owner |
| --- | --- |
| UI rendering for migrated routes | Django SPA shell (`templates/react_spa.html`) + React (`frontend-react/src/*`) |
| SEO search scopes (`/search/region/*`, `/search/city/*`) | Django SPA shell + React SearchPage (API scoped by `region_slug`/`city_slug`) |
| Session/auth + business logic | Django |
| Data API | Django (`house.api`) |
| Legacy templates | Kept as fallback/artifacts, not deleted |

## 4) Dev proxy map (Vite)

Source: `frontend-react/vite.config.js`.

Proxied to Django backend:
- `^/api/(?!(demo|admin)(?:/|$)).*`
- `/accounts`
- `/consultation`
- `/login`
- `/like`
- `/logout`
- `/register`
- `/activate`
- `/verify`
- `/properties`
- `/media`
- `/static`
- `/test/map/interactive/data`

Not proxied intentionally (handled as SPA UI routes):
- `/search/*`
- `/likes/*`
- `/property/*`
- `/api/demo/*`
- `/api/admin/*`
- `/signup/*`

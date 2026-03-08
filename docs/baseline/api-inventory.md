# Baseline API Inventory (Frontend-consumed)

Snapshot date: 2026-02-15  
Scope: only endpoints currently called from `frontend-react/src/*`.

## 1) Endpoint table

| Endpoint | Method | Used in | Auth | Request shape | Response fields used |
| --- | --- | --- | --- | --- | --- |
| `/api/csrf/` | `GET` | App, Search, Likes, PropertyDetail | No | none | `csrfToken` (optional), cookie side effect |
| `/api/properties/?featured=true&status=active&page=1&page_size=3` | `GET` | Home (`App`) | No | query params | `results[]` |
| `/api/properties/?status=active&ordering=-created_at&page=1&page_size=6` | `GET` | Home fallback | No | query params | `results[]` |
| `/api/properties/?...` | `GET` | Search | No | `q`, `property_type`, `price_min/max`, `area_min/max`, `rooms_min/max`, `sort`, `page`, `page_size`, `per_page`, `currency`, `status` | `results[]`, `count`, `page`, `total_pages` |
| `/api/property-types/` | `GET` | Search filters | No | none | `results[]` |
| `/api/liked-properties/?ids=1` | `GET` | Search, PropertyDetail | Session user | query `ids=1` | `results[]` (numeric ids) |
| `/api/liked-properties/` | `GET` | Likes page | Session user | none | `results[]`, `count` |
| `/api/properties/by-slug/:slug/` | `GET` | Property detail | No | slug path param | `result` |
| `/consultation/` | `POST` | Home form, Property detail form | No (CSRF required) | x-www-form-urlencoded: `name`, `phone`, `email`, `message`, `property` | success/error JSON; `errors[]`/`message` |
| `/login/` | `POST` | Login modal | No (CSRF required) | x-www-form-urlencoded: `email`, `password`, `next` | `status`, `next`, `message`, `user` |
| `/logout/` | `POST` | Header/mobile logout | Session user (CSRF required) | empty body | JSON `{status:"ok"}` or redirect behavior |
| `/like/:propertyId/` | `POST` | Search, Likes, Property detail | Session user (CSRF required) | empty body | `status` = `liked`/`unliked` |
| `/properties/:propertyId/toggle-featured/` | `POST` | Search, Likes (staff action) | Staff (expected) | x-www-form-urlencoded: `featured=true|false` | `featured` |

## 2) Client-side headers/assumptions

Common headers:
- `Accept: application/json`
- `X-Requested-With: XMLHttpRequest` for auth-sensitive operations
- `X-CSRFToken: <token>` for POST
- `Content-Type: application/x-www-form-urlencoded` for form-style POST

CSRF acquisition path:
1. Read `#csrf-token` hidden input or `csrftoken` cookie.
2. If missing, call `/api/csrf/`.

## 3) Response assumptions and implicit contracts

- List endpoints assume `{ results: [], count?: number, page?: number, total_pages?: number }`.
- Property-by-slug assumes `{ result: { ...property } }`, not `{ results: [...] }`.
- Like toggle assumes strict `status` enum: `liked` or `unliked`.
- Auth-required list endpoints use `401/403` to trigger login modal flow.

## 4) Contract risks to resolve in hardening stage

- Response schemas are not yet formally documented server-side for all endpoints.
- Some POST flows rely on cookie existence timing for CSRF.
- Mixed redirect vs JSON behavior still exists for `/logout/` depending on request context.

# DOMINIUM Auth, Search Console, and Article Import Design

## Intent

Make customer authentication deterministic in the React SPA, give staff a read-only Google Search Console dashboard, and make SEO articles easy to create manually or import from ChatGPT without allowing unsafe HTML.

## Decisions

- Google sign-in follows the Coffeelini architecture: Google Identity Services returns an ID credential to React; React posts it with CSRF to Django; Django verifies audience, issuer, expiry, subject, and verified email, safely reuses or creates a user, establishes the normal Django session, and returns the session payload. Existing allauth routes remain as a compatibility fallback during rollout.
- Password login/logout and Google login all refresh the same `/api/auth/session/` state. The current page is retained; authentication errors stay visible instead of being masked by reloads.
- Search Console uses a server-side service account with the readonly webmaster scope. Credentials are environment-only. The service-account email must be granted access to the `sc-domain:dominium.com.ua` property. The admin endpoint caches results and returns a clear `not_configured`, `forbidden`, `quota`, or upstream-error state without leaking credential details.
- The SEO dashboard shows 7/28/90-day clicks, impressions, CTR, average position, daily series, top queries, and top pages. Recent incomplete data is labelled. Search Console is not realtime; the UI states that finalized data normally trails by 2-3 days.
- Published article detail pages remain public and indexable. Drafts remain staff-only and excluded from public APIs/sitemaps. The footer link is visible only to staff.
- An article has an optional cover plus ordered inline editorial images with required alt text and optional captions. Images are uploaded locally, normalized by the server, and rendered without arbitrary HTML.
- Staff can paste JSON or upload a JSON file. Import validates a documented schema, previews it, rejects duplicate slugs, and always creates a draft. A copyable Ukrainian prompt tells ChatGPT to return JSON only. Imported text never publishes automatically and never contains executable HTML.

## Approaches Considered

- Auth: keep allauth redirects; replace them with GIS credential exchange; or add GIS alongside allauth. Chosen: GIS as the primary SPA flow while retaining allauth fallback for rollback compatibility.
- Search Console: admin OAuth with refresh-token storage; service account; manual CSV. Chosen: service account because the dashboard is unattended and readonly, and no user token belongs in the database.
- Article import: Markdown/HTML import; strict JSON; manual-only editor. Chosen: strict JSON because it is easy for ChatGPT to generate and easy to validate safely.

## Constraints

- Do not expose Google credentials, service-account JSON, refresh tokens, or Telegram secrets.
- Do not remove Django templates or existing allauth routes.
- Do not publish imported content automatically.
- Do not add AI generation or external image downloading to the site.
- Preserve current users, sessions, articles, slugs, CRM IDs, and unrelated working-tree/production changes.

## Verification

- Backend regression tests cover verified/unverified Google credentials, user reuse, duplicate prevention, session creation/logout, staff permissions, Search Console configuration/errors/cache/schema, JSON import validation/draft-only behavior, image ordering, and public/draft visibility.
- Frontend tests cover Google credential submission/session refresh, staff-only footer link, import parsing/preview/prompt, Search Console states, and article image rendering.
- Run Django checks/tests, React lint/tests/build, runtime/SEO smoke, and authenticated browser QA where credentials are available.


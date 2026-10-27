# Shared Site Shell Design

## Intent

Use the current `/search/` desktop header as the visual reference and make header, footer, and mobile navigation identical on every public and staff SPA route and on the retained Django-template shell.

## Approach

- Selected: one semantic shell contract implemented by both React and Django templates, backed by shared CSS classes in `style-base.css`.
- Rejected: route-specific size overrides, because they caused drift between the legacy homepage and React routes.
- Rejected: deleting the Django templates, because their migration remains explicitly deferred.

## Contract

- Desktop header appears from `lg`, has one fixed height, one logo size, the same navigation/auth/social layout, and an accessible active-page state.
- Mobile uses the existing bottom navigation consistently; the desktop header is hidden.
- Footer markup, staff-only Articles link, social links, analytics disclosure, spacing, and current copyright year match across both renderers.
- Main content offsets use the same header token instead of a search-only offset.

## Verification

- Unit-test active-route resolution and shell class contract.
- Run React tests, lint, production build, Django checks and SPA-shell tests.
- Browser-smoke home, search, property, likes, articles, and API admin at desktop and mobile widths.

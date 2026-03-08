# UI Parity Checklist (Desktop + Mobile)

Snapshot date: 2026-02-15  
Purpose: fixed acceptance checklist before/after each migration/refactor step.

Legend:
- `[ ]` not verified in this pass
- `[x]` verified
- `N/A` not applicable

## 1) Global shell
- [ ] Header links: `Головна / Пошук / Обране` visible and clickable (desktop)
- [ ] Mobile bottom nav visible and clickable
- [ ] Preloader fade-out behavior unchanged
- [ ] Scroll-to-top button appears after scroll
- [ ] Toast styles/positions consistent with baseline
- [ ] Font rendering and spacing visually match legacy

## 2) Home (`/`)
- [ ] Hero video lazy-load behavior unchanged
- [ ] Search form in hero submits to `/search/` with query
- [ ] Featured slider works on mobile (prev/next)
- [ ] Featured cards grid looks identical on desktop
- [ ] Deal type badge colors/text unchanged
- [ ] Contact form fields and validation texts unchanged
- [ ] Contact submit success/error message UI unchanged

## 3) Search (`/search/`, `/search/region/*`, `/search/city/*`)
- [ ] Header search and main search are in sync
- [ ] Filters: property type, price, area, rooms work and persist in URL
- [ ] Active chips add/remove correctly
- [ ] Sorting and page size controls match old behavior
- [ ] Pagination visual and behavior parity
- [ ] Like/unlike works with same icon/text feedback
- [ ] Share actions (copy/telegram/viber) available and styled the same
- [ ] Staff-only "Топ 3" toggle visible only for staff
- [ ] Empty/loading/error states look consistent

## 4) Likes (`/likes/`)
- [ ] Unauthorized access opens login flow, no broken layout
- [ ] Title/description blocks match baseline
- [ ] Cards layout parity desktop/mobile
- [ ] Like/unlike updates card list immediately
- [ ] Staff "Топ 3" toggle parity
- [ ] Share dropdown parity
- [ ] Empty state copy/style parity

## 5) Property detail (`/property/:slug/`)
- [ ] Gallery desktop/mobile parity (thumbnails, active image)
- [ ] Gallery modal open/close + keyboard behavior parity
- [ ] Price/address/features text styles unchanged
- [ ] Map loads and base-layer switch works
- [ ] Contact form (right column) parity and submit behavior parity
- [ ] Like/share controls parity
- [ ] Staff action buttons/modal visibility parity
- [ ] 404/not-found error state is usable and styled correctly

## 6) Auth modals
- [ ] Register modal opens/closes with same animation
- [ ] Login modal opens/closes with same animation
- [ ] Password visibility toggle works
- [ ] Google auth buttons keep same labels/icons
- [ ] Login errors are shown in modal without layout shift issues

## 7) Responsive matrix (minimum)

Test breakpoints:
- Mobile: 390x844 (iPhone-like)
- Tablet: 768x1024
- Desktop: 1440x900

Per breakpoint check:
- [ ] No horizontal scroll regression
- [ ] No clipped CTA/buttons
- [ ] Fixed elements (header/mobile nav/toast) do not overlap critical content

## 8) Baseline commands to run with each parity pass

```bash
cd frontend-react
npm run lint
npm run build
```

Backend quick sanity:
```bash
./.venv_codex/bin/python manage.py check
```

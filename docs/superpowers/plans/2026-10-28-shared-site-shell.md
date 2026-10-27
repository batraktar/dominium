# Shared Site Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make header, footer, and mobile navigation consistent across all DOMINIUM routes while preserving Django templates.

**Architecture:** React and Django keep their renderers but consume the same semantic CSS contract and route rules. `/search/` is the desktop visual reference.

**Tech Stack:** React, Django templates, shared CSS, Node test runner.

**Spec:** `docs/superpowers/specs/2026-10-28-shared-site-shell-design.md`

## Global Constraints

- Do not remove Django templates.
- Do not touch unrelated untracked files.
- Preserve staff-only visibility of Articles and API admin links.

## Review Focus

- Exact route matching must not mark `/property/` as home.
- Staff-only links must stay hidden from guests.
- Fixed header must not overlap main content.
- Mobile must not show both desktop header and bottom navigation.
- Legacy templates and React must use the same shell classes.

### Task 1: Route-aware shell model

**Files:**
- Create: `frontend-react/src/features/layout/model/siteShellModel.js`
- Create: `frontend-react/test/site-shell-model.test.js`

- [ ] Write failing tests for active navigation and class contract.
- [ ] Implement the smallest route/class model.
- [ ] Run the focused test.

### Task 2: Shared header and footer contract

**Files:**
- Modify: `frontend-react/src/features/layout/components/MainHeader.jsx`
- Modify: `frontend-react/src/features/layout/components/MainFooter.jsx`
- Modify: `frontend-react/src/app/components/AppFrame.jsx`
- Modify: `templates/partials/header.html`
- Modify: `templates/partials/footer.html`
- Modify: `templates/partials/mobile_nav.html`
- Modify: `templates/base.html`
- Modify: `static/base/assets/css/style-base.css`
- Modify: `frontend-react/src/index.css`

- [ ] Apply shared semantic classes and active state.
- [ ] Remove the search-only header exception and offset.
- [ ] Match staff-only links, disclosure, and current year.

### Task 3: Verification

- [ ] Run React tests, lint, and production build.
- [ ] Run Django checks and relevant SPA-shell tests.
- [ ] Browser-smoke representative desktop and mobile routes.

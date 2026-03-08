# Baseline Known Issues / Risks

Snapshot date: 2026-02-15

## High

1. **Auth state source is still template dataset-based**
   - Symptoms: React reads `document.body.dataset.userIsAuthenticated` and related fields.
   - Risk: if app is served as standalone SPA without Django-injected dataset, UI may treat logged-in users as guests.
   - Affected area: header auth state, likes page access flow, prefilled contact info.
   - Planned stage: Auth hardening + data bootstrap stage.

2. **Mixed redirect and JSON behavior in auth/logout flows**
   - Symptoms: some paths still allow redirect semantics while React expects JSON-first behavior.
   - Risk: edge-case navigation jumps or inconsistent UX on session transitions.
   - Planned stage: Auth flow hardening.

## Medium

3. **Tailwind CDN usage warning in browser console**
   - Source: `frontend-react/index.html` includes `https://cdn.tailwindcss.com`.
   - Browser warning: CDN-in-production warning appears.
   - Risk: non-optimal production setup and noisy console.
   - Planned stage: Frontend build hardening.

4. **Build-time font warnings in Vite**
   - Symptoms: unresolved-at-build warnings for font paths under `/static/base/assets/fonts/*`.
   - Current impact: build succeeds; runtime resolves assets via static paths.
   - Risk: brittle path handling across environments.
   - Planned stage: asset pipeline cleanup.

5. **Unknown route fallback currently renders home**
   - Symptoms: any non-matched path in React runtime falls back to home content.
   - Risk: no explicit SPA 404 handling and potential SEO mismatch.
   - Planned stage: routing hardening + SEO stage.

## Low

6. **Bundle size growth trend**
   - Observation: current build artifact around ~455KB JS (before gzip).
   - Risk: slower first-load on weak networks.
   - Planned stage: performance optimization.

7. **External share deep-link behavior depends on client platform**
   - Symptoms: Viber deep-link can fallback differently by browser/device.
   - Risk: inconsistent user-perceived behavior, expected but should be documented.
   - Planned stage: e2e coverage and UX documentation.

## Verification snapshot (latest run)

- Frontend lint: pass
- Frontend build: pass (with font warnings)
- Django check: pass

Commands:
```bash
cd frontend-react && npm run lint
cd frontend-react && npm run build
./.venv_codex/bin/python manage.py check
```

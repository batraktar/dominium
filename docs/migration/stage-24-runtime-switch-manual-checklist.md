# Stage 24 Manual Regression Checklist (React SPA Shell Runtime)

Дата: 2026-02-17

## Ціль
Підтвердити, що мігровані маршрути віддаються через `react_spa.html`, працюють з parity UI/UX, і не повертають користувача на legacy runtime.

## Передумови
1. `cd frontend-react && npm run build` (оновлює `dist/.vite/manifest.json`).
2. Django запущений з актуальним `.env`.
3. Для dev-HMR (необов'язково): `REACT_SPA_DEV_SERVER_URL=http://localhost:5173`.
4. Для production перевірки canonical: задано `SEO_CANONICAL_HOST` + `SEO_CANONICAL_SCHEME=https`.
5. (Опційно) `scripts/runtime_switch_smoke_check.sh http://localhost:8000` для автоматичної базової перевірки SPA-shell runtime.

## Маршрути, що мають працювати через SPA shell
1. `/search/`
2. `/likes/`
3. `/property/<slug>/`
4. `/api/demo/`
5. `/api/admin/`
6. `/test/map/interactive/`
7. `/signup/?method=email`
8. `/search/region/<slug>/`
9. `/search/city/<slug>/`

## Обовʼязкові перевірки
1. Source/HTML містить `<div id="root"></div>` і не містить legacy content blocks відповідної сторінки.
2. Нема переходів UI на `127.*`/`localhost:8000` сторінки (окрім API запитів).
3. Browser console: без нових critical errors.
4. SEO header parity: `X-Robots-Tag` присутній і відповідає `<meta name="robots">`.
5. JSON-LD присутній:
   - search routes: `WebSite + SearchAction`, `CollectionPage`, `BreadcrumbList`;
   - property detail: `RealEstateListing`.
6. Auth modal bridge працює (`dominium:auth-required`) для неавторизованих like/actions.
7. На `/api/admin/`:
   - staff: сторінка доступна;
   - non-staff: 404.
8. На `/property/<invalid-slug>/`: backend 404 (не SPA blank page).
9. `/search/region/<slug>/` і `/search/city/<slug>/` теж рендеряться через SPA shell (`id="root"`) з коректним `<title>` і robots/canonical.
10. HTML SPA-shell містить marker `meta[name="dominium-runtime-shell"][content="react-spa"]`.

## Результати (заповнювати після ручної перевірки)
- [ ] `/search/`
- [ ] `/likes/`
- [ ] `/property/<slug>/`
- [ ] `/api/demo/`
- [ ] `/api/admin/` staff/non-staff
- [ ] `/test/map/interactive/`
- [ ] `/signup/?method=email`
- [ ] `/property/<invalid-slug>/`
- [ ] `/search/region/<slug>/`
- [ ] `/search/city/<slug>/`

## Відомі технічні борги
1. Build warning про великий JS chunk (`>500kB`) лишається і не є блокером цієї ітерації.
2. Legacy templates збережені в репозиторії (не видалялись), але не мають бути runtime source для мігрованих маршрутів.

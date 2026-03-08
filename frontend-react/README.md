# frontend-react

Окремий React-проєкт для поетапної міграції фронтенду без видалення оригінальних Django-шаблонів.

## Поточний статус

- `Stage 1`: перенесено для актуального `base`: `header`, `hero`, `featured`, `about`, `contact`, `footer`, `mobile nav`, `auth modals`.
- `Stage 2`: `featured` тепер тягне реальні дані з `/api/properties/` з fallback на локальні картки.
- `Stage 3`: форма в блоці `contact` відправляє дані на `/consultation/` та показує статус відправки.
- `Stage 4`: перенесено сторінку `/search/` у React (`SearchPage`) зі збереженням адаптивної верстки, фільтрів, сортування, пагінації, лайків та меню поширення.
- `Stage 5`: перенесено сторінку `/likes/` у React (`LikesPage`) зі збереженням карток, адаптиву, лайків, staff-toggle для `Топ 3` і share-меню.
- `Stage 6`: перенесено `/property/:slug` у React (`PropertyDetailPage`) з галереєю, картою Leaflet, формою контакту, лайком і share-меню.
- `Stage 7`: auth-флоу в React: логін-модалка надсилає дані на `/login/` (JSON), неавторизовані дії в `search/likes/property` відкривають модалку без редіректу на Django-шаблони, CSRF ініціалізується через `/api/csrf/`.
- `Stage 8`: global UI effects декомпозовано на модульні хуки (`page-meta`, `preloader`, `scroll`, `hero-video`, `modal-bridge`, `featured-swiper`) без зміни DOM-контрактів і дизайну.
- `Stage 9`: search-фіча декомпозована на підмодулі (`search-filter-actions`, `search-result-actions`, `search-state`, `searchResultsQueryModel`, секційні UI-компоненти) без зміни верстки та поведінки.
- `Stage 10`: likes-фіча декомпозована на підхуки (`likes-page state/load/share-menu/toast/actions`) і секційні card-компоненти без зміни UX/адаптивів.
- `Stage 11`: property-detail controller декомпозовано на підхуки (`property-detail state/bootstrap/load/ui/derived/actions`) і page-секції (`PropertyPageContentSection`, `PropertyContactSuccessModal`) без редизайну.
- `Stage 12`: `PropertyDetailPage` переведено на thin view-model (`usePropertyDetailPageViewModel`) з тим самим UI-контрактом і без зміни класів/адаптиву.
- `Stage 13`: `property` декомпозовано далі: `usePropertyMapController` переведено на `property-map` lifecycle/state підхуки, `PropertyMainInfoSection` розбито на секційні компоненти (`staff-actions`, `summary-stats`, `description`, `features`) без зміни верстки.
- `Stage 14`: `property` UI декомпозовано далі: `PropertyContactSidebar` і `PropertyPageContentSection` переведені на підсекції (`contact-sidebar/*`, `content/*`), а дублікат like/share у desktop/mobile галереях винесено в `gallery-actions/*` без змін UX.
- `Stage 15`: галереї `property` декомпозовано на layout-підкомпоненти (`gallery-layout/*`: desktop grid, mobile viewport, mobile caption) зі збереженням поточної mobile/desktop поведінки та класів.
- `Stage 16`: без подальшої мікрофрагментації спрощено контракт сторінки: `PropertyPageContentSection` тепер працює через grouped-props (`gallerySectionProps`, `mainInfoSectionProps`, `contactSidebarProps`), що зменшує prop-drilling і шум у view-model.
- `Stage 17`: без додаткового дроблення файлів оновлено контракт `usePropertyDetailController` на доменні групи (`page`, `gallery`, `contact`), щоб прибрати плоский перевантажений API і зробити orchestration читабельнішим.
- `Stage 18`: home data-layer перенесено з `shared` у `features/home` (`featuredPropertyModel`, `homeFeaturedApi`, `useHomeFeaturedProperties`), `useAppController` переведено на `enabled: isHomeRoute`, fallback-картки та UI parity збережені.
- `Stage 19`: додано React-маршрути для `/test/map/interactive/`, `/api/demo/` і SPA `404` (`features/map-test`, `features/admin`, `features/system`), інтерактивна мапа переведена на `apiClient` (`/test/map/interactive/data/`) з parity стилів і без переходів на `127.*`.
- `Stage 20`: додано React-маршрут `/api/admin/` (`PropertyApiAdminPage`) з 1:1 legacy-розміткою; dev-proxy оновлено, щоб `/api/admin` не перехоплювався backend proxy як сторінка.
- `Stage 21`: admin data-layer перенесено в React feature (`features/admin/hooks/usePropertyApiAdminController.js` + `features/admin/services/propertyAdminApi.js`) без підвантаження legacy script; HTTP виклики йдуть через `apiClient`, UI/markup parity збережено.
- `Stage 22`: `usePropertyApiAdminController` декомпозовано на модулі `features/admin/hooks/property-admin/*` (`table`, `form`, `images`, `import`, `highlight`, `state`, `dom-refs`, `common`); сторінковий hook став thin orchestration без зміни markup/UX.
- `Stage 23`: додано SPA-маршрут `/signup/` (`SignupRedirectPage`), який повторює Django-поведінку: клієнтський redirect на `/?register=<method>&...` для відкриття реєстрації без fallback у `404`.
- `Stage 24`: Django runtime для мігрованих сторінок переведено на React SPA-shell (`react_spa.html`) для маршрутів `/search/`, `/likes/`, `/property/:slug/`, `/api/demo/`, `/api/admin/`, `/test/map/interactive/`, `/signup/`; лендінг (`/`) лишається Django-template.
- `Stage 25`: runtime hardening — Vite `manifest` в build, CSP auto-розширення для `REACT_SPA_DEV_SERVER_URL` у DEBUG (script/style/connect + ws), оновлено env/docs для стабільного запуску Django + React shell.
- `Stage 26`: `adminTableController` декомпозовано без зміни UI на `adminTableSelection` + `adminTableView`; table-hook став thin-controller зі збереженням bulk/select/pagination поведінки.
- `Stage 27`: `/search/region/:slug` і `/search/city/:slug` переведено на SPA shell; Search API отримав scope-фільтри `region_slug`/`city_slug`, React SearchPage передає їх автоматично з pathname (без зміни дизайну).
- `Stage 28`: SEO hardening для React runtime: server-side `X-Robots-Tag`, розширені OpenGraph/Twitter meta, `WebSite + SearchAction` schema, `CollectionPage + BreadcrumbList` для search-роутів і `RealEstateListing` schema + property OG image для `/property/:slug/`.
- `Stage 29`: оформлено операційний SEO-аудит: route matrix + Google Search Console checklist (`docs/seo/*`) і технічний smoke-check скрипт `scripts/seo_smoke_check.sh` для релізного gate.
- `Stage 30`: додано canonical-host hardening (`SEO_CANONICAL_HOST`, `SEO_CANONICAL_SCHEME`) для SSR meta/schema/robots/image-sitemap, щоб уникати дубльованої індексації між host-варіантами.
- `Stage 31`: canonical query hardening — tracking params (`utm_*`, `gclid`, `fbclid`, `msclkid`, `yclid`, `_ga`, `_gl`) більше не потрапляють у canonical/noindex-логіку search/home; додано `X-Robots-Tag` parity для legacy home/map SSR-відповідей.
- `Stage 32`: `map-test` декомпозовано без редизайну: `InteractiveMapPage` розбито на секційні компоненти (`header/canvas/sidebar/attribution`), а `useInteractiveMapController` переведено на композицію підхуків (`theme`, `data`, `leaflet`) для читабельного thin orchestration.
- `Stage 33`: `api/admin` edge-case hardening без зміни markup: додано abort-safe lifecycle для таблиці (скасування попередніх load і захист від out-of-order responses), блокування подвійних submit/delete у формі, abort+single-flight для імпорту і cleanup усіх активних запитів в orchestrator.
- `Stage 34`: відновлено auth popup bridge parity у React modal effects: `data-google-auth` тепер підтримує centered popup + monitor close/reload, `message`-listener для `dominium-auth-success`, коректне закриття login/register модалок і fallback на redirect при блокуванні popup.
- `Stage 35`: P2 404 parity hardening: React `NotFoundPage` синхронізовано з legacy-варіантами текстів, а Django `handler404` тепер повертає SEO-safe `noindex, nofollow` (`meta + X-Robots-Tag`) з canonical для поточного path.
- `Stage 36`: runtime-switch audit hardening: у `react_spa.html` додано технічний marker `meta[name=\"dominium-runtime-shell\"]`, backend тести фіксують SPA-shell runtime для мігрованих роутів та відсутність legacy page-scripts, додано smoke script `scripts/runtime_switch_smoke_check.sh`.
- `Stage 37`: security hardening without UI changes: login endpoint отримав rate-limit (cache-based), email activation link формуються через `request.build_absolute_uri` (без hardcoded `http://`), admin image API має explicit staff JSON-guard + валідацію SVG/size/files-per-request + перевірку image payload signature (Pillow verify), prod settings посилено (`nosniff`, `DENY`, stricter allauth defaults).
- `Stage 38`: CSP nonce foundation: middleware генерує per-request nonce і підставляє його в CSP (`{nonce}` placeholder), inline scripts у runtime templates переведено на `nonce="{{ request.csp_nonce }}"`, додано optional `DJANGO_CONTENT_SECURITY_POLICY_REPORT_ONLY` для безпечного rollout stricter policy.
- `Stage 39`: увімкнено stricter CSP rollout у `Report-Only` за замовчуванням (`DJANGO_CSP_STRICT_REPORT_ONLY=1`): policy автоматично прибирає `unsafe-inline` із `script-src`, додає `report-uri` (`DJANGO_CSP_REPORT_URI`, default `/_csp/report/`), і backend endpoint `/_csp/report/` приймає browser reports для поступового переходу до enforce.
- `Stage 40`: hardening client-IP trust + CSP report ingestion: `X-Forwarded-For` більше не довіряється без явного env-allow (`DJANGO_TRUST_X_FORWARDED_FOR` + `DJANGO_TRUSTED_PROXY_IPS`), а `/_csp/report/` отримав rate-limit (`DJANGO_CSP_REPORT_RATE_LIMIT/WINDOW`) проти log-flood.
- `Stage 41`: додано browser security headers hardening без змін UI (`Permissions-Policy`, `Cross-Origin-Resource-Policy`, `X-Permitted-Cross-Domain-Policies`, `Origin-Agent-Cluster`) з env-керуванням і backend тестами.
- `Stage 42`: fine-tuned `Permissions-Policy` під реальні сценарії: `geolocation/fullscreen` закрито, `clipboard-write` і `web-share` лишено для copy/share дій у пошуку/лайках/property без UI-регресій.
- `Stage 43`: pre-deploy cleanup: вирівняно dark-green parity на featured секції (`bg-primary` fallback у `style-base.css` + явний `bg-primary` для home featured), Tailwind config для React shell/dev-index централізовано через `static/base/assets/js/tailwind_config.js`, а в DEBUG origin `REACT_SPA_DEV_SERVER_URL` auto-додається в `CSRF_TRUSTED_ORIGINS`.
- Підключено ті самі базові стилі з `static/base/assets/css/style-base.css`.

## Запуск

```bash
cd frontend-react
npm install
npm run dev
```

Dev-сервер Vite проксить бекенд-запити на Django (`http://localhost:8000` за замовчуванням).  
Якщо бекенд запущений на іншому хості/порту, задай `VITE_BACKEND_URL` перед запуском:

```bash
VITE_BACKEND_URL=http://localhost:8001 npm run dev
```

## Збірка

```bash
npm run build
```

Після `build` генерується `dist/.vite/manifest.json` — його використовує Django SPA-shell для підключення актуальних asset-файлів.

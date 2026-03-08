# Програма Якості (без React-міграції)

## Мета
Побудувати стабільний, безпечний і швидкий продукт на поточному Django SSR стеку, без ризикового переписування фронтенду.

## Принципи
1. Security-first: спочатку закриваємо вразливості, потім масштабування.
2. SEO-first для публічних сторінок: не ламати SSR-індексацію.
3. Small-batch delivery: короткі і перевірені ітерації.
4. Кожна зміна проходить перевірки (`check`, `test`, smoke).

## KPI (цільові)
1. `0` критичних вразливостей (authz/xss/ssrf/csrf).
2. `LCP < 2.5s`, `CLS < 0.1`, `INP < 200ms` на ключових сторінках.
3. `100%` staff-only для mutating admin/import endpoint-ів.
4. `0` падінь базових smoke-тестів у CI.
5. Стабільний індекс у Google (sitemap/robots/schema/canonical без помилок).

## Треки Робіт

### 1) Security Track
1. Прибрати зайвий inline JS та перейти до strict CSP-профілю поетапно.
2. Уніфікувати перевірки прав доступу (RBAC) по всіх API.
3. Дотиснути sanitization-політики для user-generated полів.
4. Закрити edge-cases по імпорту (allowlist, контент-тайп, size, redirects).

### 2) Performance Track
1. Добити рендер-критичні ресурси (дефер/пріоритезація/прелоад за потреби).
2. Системно прибрати CLS/LCP-причини (розміри медіа, стабільна верстка блоків).
3. Оптимізувати скриптове навантаження на сторінках пошуку та деталей.
4. Перевірити кешування відповідей та стабільність API для фільтрів.

### 3) UX + Accessibility Track
1. Єдина система фокус-станів і клавіатурної навігації.
2. ARIA-атрибути для іконкових кнопок, модалок, галерей, пагінації.
3. Вирівняти мобільні брейкпоінти та поведінку інтерактивних компонентів.
4. Прибрати дублікати елементів/скриптів, що можуть ламати UX.

### 4) SEO Track
1. Підтримка технічного SEO: canonical/hreflang/schema/sitemap/image-sitemap.
2. Контроль індексації фільтрів (правильні meta robots та canonical логіка).
3. Підсилення сторінок регіонів/міст релевантними блоками і структурованими даними.
4. Моніторинг технічних помилок індексації.

### 5) Reliability + Testing Track
1. Розширити regression-тести для security і parsing flow.
2. Додати smoke-набір на critical user journeys.
3. Підтримувати стабільні локальні перевірки перед кожним merge.

## План Ітерацій

## Iteration 1 (виконано)
1. Базові фронтенд-покращення: a11y + CWV + часткове прибирання inline JS.
2. Безпечніша галерея без `|safe` JS-інʼєкції масиву зображень.
3. Базова стабілізація шаблонів і скриптів.

## Iteration 2 (наступна)
1. CSP Hardening Pass:
   - зменшити залежність від `unsafe-inline`;
   - [x] винесено великий inline admin-скрипт зі сторінки деталей у `static/base/assets/js/property_detail_admin.js`;
   - [x] винесено inline map-скрипт у `static/base/assets/js/property_map.js`;
   - [x] винесено inline query-sync скрипт фільтрів у `static/base/assets/js/search/base_filters_sync.js`;
   - [x] прибрано inline `window.SEARCH_API_URL` (перехід на `data-search-api-url`).
   - [x] прибрано inline Tailwind config з `templates/base.html` у `static/base/assets/js/tailwind_config.js`.
   - [x] прибрано inline `onclick`-керування галереєю зі `templates/partials/gallery.html` через data-action + delegation у `static/base/assets/js/gallery.js`.
   - [x] прибрано inline JS зі `templates/404.html`, `templates/socialaccount/signup.html`, `templates/api/property_api_demo.html`, `templates/partials/auth/login.html`.
   - [x] прибрано inline bootstrap-конфіг script з `templates/api/property_api_admin.html` (парсинг JSON-конфігу перенесено в `static/base/assets/js/property_api_admin.js`).
   - [x] винесено решту великих inline-блоків JS зі сторінок деталей/фільтрів у static JS.
2. Frontend Security Regression:
   - [x] перевірено `|safe` у шаблонах публічної частини;
   - [x] прибрано ризиковий `|safe` з пагінації (`templates/partials/pagination.html`);
   - [x] unsafe-injection масиву зображень уже прибрано з галереї (DOM-based init);
   - [x] `structured_data|safe` замінено на контрольований `json_ld` фільтр з escaping (`house/templatetags/security_filters.py`).
   - [x] залишено тільки контрольовані сценарії (JSON-LD через `json_ld`) у публічній частині.
3. Performance Pass:
   - [x] знято контрольні метрики Lighthouse (desktop):
     - home: score `90`, LCP `1.1s`, TBT `190ms`;
     - search: score `93`, LCP `1.5s`, TBT `60ms`;
     - detail: score `99`, LCP `0.9s`, TBT `0ms`.
   - [x] прибрано глобальне завантаження `swiper` CSS з `base` (залишено тільки для home).
   - [x] прибрано непотрібний `echarts` скрипт зі сторінки деталей.
   - [x] оптимізовано detail-view (`select_related`/`prefetch_related`) і шаблони (`property_images` / `property_features`) для зменшення зайвих запитів.
   - [x] оптимізовано hero-секцію: lazy-load background video + відключення завантаження відео на mobile/reduced-motion/save-data.
   - [x] прибрано зайві render-blocking підключення шрифтів у `base`/`search` шаблонах.
4. Import + Parsing Quality:
   - [x] додано dedupe імпортованих фото за перцептивним хешем (боротьба з дублями watermark/non-watermark) у `house/services/importer.py`;
   - [x] додано пріоритезацію якісніших URL фото при імпорті;
   - [x] покращено витяг координат з JSON-LD та map URL у `house/utils/html_parser.py`;
   - [x] додано regression-тести для image dedupe і geo parsing.

## Iteration 3
1. SEO контрольний пакет:
   - [x] перевірка sitemap/robots/schema;
   - [x] додано `rel="prev"/"next"` мета-посилання для пагінованого пошуку (`templates/search_filters.html`, `views/search.py`);
   - [x] покращено `og:image` для search/region/city сторінок (використовується реальне фото обʼєкта, якщо доступно).
2. Тестове покриття:
   - [x] додано regression-сценарії для пошуку/SEO (pagination rel links, `og:image`), парсингу та імпорту.

## Definition of Done (DoD)
1. Код проходить `python manage.py check`.
2. Код проходить `python manage.py test`.
3. Немає нових critical/high security findings.
4. Для змін у шаблонах/JS немає видимих регресій на mobile/desktop.
5. Оновлено документацію по внесених змінах.

## Правило Майбутньої React-міграції
Рішення про React приймається лише після виконання цієї програми або при появі чіткої бізнес-вимоги:
1. Великий інтерактивний кабінет, який важко підтримувати на SSR-шаблонах.
2. Потреба у складному client-side state з високою частотою оновлень.
3. Наявність ресурсів на поетапну гібридну міграцію без втрати SEO.

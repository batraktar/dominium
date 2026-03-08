# React + Django Senior Migration Plan

## 0) Контекст і ціль
- Ціль: перевести фронтенд на React (SPA-підхід) із Django як backend/API, зберігши поточний дизайн, адаптиви і UX.
- Обмеження:
  - Оригінальні Django-шаблони не видаляємо.
  - Будь-які зміни у візуалі допускаються лише як виправлення багів, не як редизайн.
  - Фронт не повинен "переїжджати" на `127.*` сторінки; Django використовується для API/auth/backend-логіки.
- Орієнтир якості: код має виглядати як робота senior fullstack-команди (архітектура, тести, CI, контроль ризиків).

## 1) Глобальні принципи виконання
- Рухаємося ітераціями: 1 етап = 1 набір малих PR.
- Для кожної зміни обов'язково:
  - `lint` + `build` на фронті.
  - backend checks + (де релевантно) тести.
  - ручна перевірка desktop/mobile для зміненого сценарію.
- Критерії готовності (DoD) для кожного етапу:
  - Немає візуальних регресій.
  - Немає критичних помилок у браузерній консолі.
  - Є задокументовані зміни і відомі ризики.

## 2) План етапів (детально)

### Етап 1. Baseline Freeze
**Мета**
- Зафіксувати поточну "точку істини": UI, маршрути, API-контракти, помилки, перформанс-базу.

**Що робимо**
- Інвентар маршрутизованих сторінок і user flows.
- Інвентар API, які реально використовує фронт.
- Збір поточних console/network помилок.
- Скріни/відео desktop + mobile по ключових сторінках.

**Артефакти**
- `docs/baseline/routes.md`
- `docs/baseline/api-inventory.md`
- `docs/baseline/ui-parity-checklist.md`
- `docs/baseline/known-issues.md`

**Критерії завершення**
- Є повний список "що має працювати і як".
- Є зафіксований список відомих технічних боргів.

**Self-prompt (для Codex)**
> Ти senior fullstack. Зафіксуй baseline без рефакторингу. Збери маршрути, API-ендпоїнти, актуальні console/network помилки та зроби parity-checklist для desktop/mobile. Не змінюй поведінку застосунку. Результат оформи markdown-артефактами в `docs/baseline/`.

---

### Етап 2. Архітектурний стандарт проєкту
**Мета**
- Визначити єдині правила структури фронта/бека і контрактів між ними.

**Що робимо**
- Фіксуємо структуру `features/shared/components/hooks/services`.
- Визначаємо API DTO та стандарт error response.
- Фіксуємо naming conventions та правила PR.

**Артефакти**
- `docs/architecture/frontend-structure.md`
- `docs/architecture/backend-api-contract.md`
- `docs/architecture/conventions.md`

**Критерії завершення**
- Будь-яка нова фіча додається без "хаотичних" рішень.
- Є однозначний стандарт для API-помилок.

**Self-prompt (для Codex)**
> Побудуй мінімальний, але строгий стандарт архітектури. Пропиши структуру папок, правила для DTO/error schema, naming і принципи розбиття компонентів. Вибирай прагматичні рішення, не over-engineering.

---

### Етап 3. Декомпозиція React застосунку
**Мета**
- Зменшити монолітність `App.jsx`, зробити код читабельним і тестованим.

**Що робимо**
- Виносимо layout-компоненти, модалки, home-блоки, route-shell.
- Виносимо великі `useEffect` у custom hooks.
- Залишаємо в `App` лише orchestration/route composition.

**Артефакти**
- Нова структура компонентів у `frontend-react/src/components/*`
- Хуки у `frontend-react/src/hooks/*`

**Критерії завершення**
- `App.jsx` не містить великі шматки DOM-розмітки і "комбайн-логіку".
- Нема візуальних змін порівняно з baseline.

**Self-prompt (для Codex)**
> Рефактор `App.jsx` поетапно: винось шматки у компоненти/хуки, не змінюючи HTML-класи й стилі. Після кожного підетапу запускай lint/build. Якщо бачиш ризик регресії UI, зупинись і перевір DOM parity.

---

### Етап 4. Data Layer та API client
**Мета**
- Централізувати роботу з API, CSRF, таймаутами, обробкою помилок.

**Що робимо**
- Створюємо єдиний `apiClient` з:
  - CSRF bootstrap,
  - timeout,
  - уніфікованою обробкою `4xx/5xx`,
  - optional retry для safe-запитів.
- Нормалізуємо internal/media URL на фронтовий origin.

**Артефакти**
- `frontend-react/src/shared/api/client.js`
- `frontend-react/src/shared/api/endpoints.js`
- `frontend-react/src/shared/utils/url.js`
- `frontend-react/src/shared/utils/api-error.js`

**Критерії завершення**
- Нема дублюваного `fetch`/CSRF коду по сторінках.
- Стабільна обробка мережевих edge cases.

**Self-prompt (для Codex)**
> Замінюй розрізнені `fetch` виклики на єдиний API-клієнт. Уніфікуй помилки в тип `UiError`, додай CSRF bootstrap через `/api/csrf/`. Не змінюй UX повідомлень, лише підвищуй стабільність.

---

### Етап 5. Auth Flow Hardening
**Мета**
- Зробити auth-флоу передбачуваним і SPA-friendly.

**Що робимо**
- Login/logout/register/social сценарії в єдиній моделі.
- Обробка `next` тільки для безпечних внутрішніх шляхів.
- Route-guards для дій, що вимагають авторизації.

**Артефакти**
- Оновлені auth endpoints/handlers.
- UI-state для auth-required modals.
- Тести для auth happy/error paths.

**Критерії завершення**
- Неавторизований користувач не ламає flow.
- Нема стрибків на сторонні/legacy сторінки без потреби.

**Self-prompt (для Codex)**
> Стабілізуй auth без зміни дизайну. Забезпеч безпечний `next`, коректну CSRF-сумісність і однакову обробку 401/403. Всі auth-required дії мають відкривати відповідний React flow.

---

### Етап 6. Search Feature Stabilization
**Мета**
- Довести `/search/` до повної parity і прод-якості.

**Що робимо**
- Синхронізуємо URL query params <-> UI стан.
- Перевіряємо фільтри, сортування, пагінацію, currency, chips.
- Уніфікуємо loading/empty/error states.
- Перевіряємо mobile UX і sticky/filter modal поведінку.

**Артефакти**
- Підчищений `SearchPage` + дрібні компоненти для секцій/контролів.
- Тести для ключових сценаріїв пошуку.

**Критерії завершення**
- Поведінка збігається з baseline.
- Нема race conditions при швидких змінах фільтрів.

**Self-prompt (для Codex)**
> Перевір Search як senior QA+engineer: URL sync, debounce/race conditions, пагінацію, сортування, filter reset. Розбивай на підкомпоненти тільки після фіксації поведінки. Додай regression-тести.

---

### Етап 7. Likes Feature Stabilization
**Мета**
- Зробити `likes` консистентним між сторінками і сесіями.

**Що робимо**
- Узгоджуємо оновлення лайків у `search`, `likes`, `property`.
- Перевіряємо обробку 401/403 і порожніх колекцій.
- Staff-specific дії виводимо в ізольовану логіку.

**Артефакти**
- Узгоджені like helpers/store/hook.
- Покриття тестами ключових кейсів.

**Критерії завершення**
- Лайк/анлайк не "роз'їжджається" між сторінками.

**Self-prompt (для Codex)**
> Побудуй єдину модель стану лайків (мінімально достатню). Забезпеч консистентність після переходів і reload. Не змінюй верстку карток, працюй лише з поведінкою і архітектурою.

---

### Етап 8. Property Detail Stabilization
**Мета**
- Довести сторінку об'єкта до production-grade стану.

**Що робимо**
- Перевіряємо галерею, map layers, контактну форму, share, like.
- Обробляємо edge cases (без фото, без координат, невалідний slug).
- Staff actions ізольовуємо в окремий модуль.

**Артефакти**
- Стабільний `PropertyDetailPage` з ізольованими компонентами.
- Автотести на критичні user paths.

**Критерії завершення**
- Нема критичних помилок на деталці в будь-якому стані даних.

**Self-prompt (для Codex)**
> Відпрацюй detail сторінку як high-risk зону: edge cases first. Покрий нещасливі сценарії, перевір map fallback, form submit, auth-required like. Збережи повну UI parity.

---

### Етап 9. Django API Hardening
**Мета**
- Підняти backend API до стабільного контрактного рівня.

**Що робимо**
- Уніфікуємо response schema (success/error).
- Централізуємо валідацію і повідомлення помилок.
- Перевіряємо permissions/throttling/caching.
- Уніфікуємо пагінацію/сортування/фільтрацію.

**Артефакти**
- Оновлені view/serializer/permissions/throttles.
- API contract doc + backend tests.

**Критерії завершення**
- Frontend не має спец-обхідних рішень під "дивні" відповіді API.

**Self-prompt (для Codex)**
> Переглянь API як платформий backend: consistency > швидкі костилі. Для кожного endpoint зафіксуй request/response/error контракт, забезпеч однакову семантику status codes і валідаторів.

---

### Етап 10. Testing Strategy
**Мета**
- Закрити основні ризики регресій автоматичними тестами.

**Що робимо**
- Frontend:
  - unit для utility/hooks/components.
  - integration для сторінкових flows.
- Backend:
  - endpoint tests (auth, filters, like, consultation).
- E2E:
  - smoke: home/search/property/likes/auth.

**Артефакти**
- Тестові набори + команди запуску.
- Мінімальні пороги coverage для критичних модулів.

**Критерії завершення**
- Критичні сценарії покриті і проходять в CI.

**Self-prompt (для Codex)**
> Додавай тести не "для галочки". Вибери сценарії з найбільшим бізнес-ризиком і покрий їх першими. Кожен баг, який виправляєш, супроводжуй тестом на регресію.

---

### Етап 11. Performance / SEO / Accessibility
**Мета**
- Підтягнути технічну якість до прод-рівня.

**Що робимо**
- Performance:
  - lazy loading, image sizing, bundle hygiene.
- SEO:
  - title/meta/canonical/structured data parity.
- A11y:
  - focus management, keyboard navigation, ARIA.

**Артефакти**
- Перформанс/SEO/a11y checklist.
- Виправлення критичних пунктів.

**Критерії завершення**
- Нема blocker-помилок по a11y/SEO/perf.

**Self-prompt (для Codex)**
> Опрацюй сторінки як production storefront: спочатку критичні Web Vitals, далі SEO metadata parity, потім a11y навігація з клавіатури. Не змінюй дизайн, покращуй технічну основу.

---

### Етап 12. CI/CD, Release, Ops
**Мета**
- Зробити релізи передбачуваними і безпечними.

**Що робимо**
- Налаштовуємо quality gates:
  - lint, build, unit/integration, backend checks.
- Додаємо release checklist і rollback strategy.
- Фіксуємо runbook: як діагностувати і відкотити.

**Артефакти**
- CI workflow updates.
- `docs/release/checklist.md`
- `docs/release/rollback.md`
- `docs/ops/runbook.md`

**Критерії завершення**
- Кожен реліз має формальний "go/no-go" контроль.

**Self-prompt (для Codex)**
> Налаштуй pipeline так, щоб він ловив регресії до merge/deploy. Опиши чіткий rollback і runbook для інцидентів. Реліз має бути відтворюваним, не залежати від ручних кроків в пам'яті команди.

---

## 3) Порядок виконання і контроль
- Послідовність: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10 -> 11 -> 12.
- Після кожного етапу:
  - короткий changelog,
  - список ризиків,
  - demo-чекліст що перевірено руками.

## 4) Шаблон звіту по етапу
```md
## Stage X - <Назва>
- Scope:
- Зроблено:
- Не зроблено:
- Ризики:
- Перевірки (команди + результат):
- UI parity status (desktop/mobile):
- Наступний крок:
```

## 5) Anti-patterns (що заборонено)
- Великі "рефактори всього одразу" без поетапної валідації.
- Дублювання API-логіки по сторінках.
- Неформалізовані контракти помилок API.
- Виправлення багів без тестів на регресію.
- Зміни стилів/верстки без прив'язки до bugfix/parity.


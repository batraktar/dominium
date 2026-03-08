# Engineering Conventions (Frontend + Backend + PR)

Version: 1.0  
Date: 2026-02-15

## 1) Ціль
- Єдині правила коду і змін.
- Мінімум хаосу в рев'ю.
- Прозорий "що і чому змінили".

## 2) Naming conventions

## 2.1 Frontend (React)
- Components: `PascalCase` (`PropertyCard.jsx`).
- Hooks: `useXxx` (`useSearchFilters.js`).
- Utils/services: `camelCase` exports (`normalizePropertyDto`).
- Feature folders: `kebab-case` або `lowercase` (рекомендовано `lowercase`).
- Constants: `UPPER_SNAKE_CASE`.
- CSS files: `<feature>-page.css` або `<component>.css` (без випадкових назв).

## 2.2 Backend (Django)
- Modules/functions/variables: `snake_case`.
- Classes/serializers/viewsets: `PascalCase`.
- URL names: `snake_case` з логічним namespace.
- API field names у JSON: `snake_case` (стабільно по всьому проекту).

## 3) Code style conventions

## 3.1 Frontend
- Один компонент = одна відповідальність.
- Не дублювати fetch/CSRF/logics по сторінках.
- Side effects через hooks, а не в глибокій JSX-розмітці.
- Не робити silent-catch без зрозумілого fallback.

## 3.2 Backend
- Явна валідація input даних.
- Однозначні HTTP статуси.
- Для API-помилок — контракт із `status/code/message`.
- Не змішувати бізнес-логіку і форматування відповіді в довгій "монолітній" функції (розносити в helper/service).

## 4) Component split rules (React)

Компонент треба розбивати, якщо:
- >120 рядків JSX.
- >2 незалежних UI-блоки в одному файлі.
- >2 async сценарії в одному компоненті.
- повторюваний блок використовується в 2+ місцях.

Результат після розбиття:
- Page component = композиція.
- Hook = state/effects.
- Service = API виклики.
- UI component = тільки рендер + прості props.

## 5) API DTO and error handling rules

- DTO мапимо в одному місці (model/mapper), не "по місцю" в JSX.
- Для кожної мережевої операції:
  - success handler,
  - expected error handler (`4xx`),
  - unexpected error fallback (`5xx/network`).
- Всі user-facing error messages мають бути читабельні українською.

## 6) Git/PR conventions

## 6.1 Branch naming
- `feat/<short-scope>`
- `fix/<short-scope>`
- `refactor/<short-scope>`
- `docs/<short-scope>`

Приклади:
- `feat/search-api-client`
- `fix/auth-next-path`
- `refactor/app-shell-split`

## 6.2 Commit style (рекомендовано)
- `feat(search): add unified query mapping`
- `fix(auth): normalize next path for json login`
- `refactor(app): extract home sections to components`
- `docs(architecture): define dto and error contract`

## 6.3 PR template (обов'язковий мінімум)
- Scope (що змінено).
- Why (навіщо).
- Risks (що може зламатися).
- Validation:
  - `npm run lint`
  - `npm run build`
  - backend checks/tests
  - ручна перевірка desktop/mobile
- Screenshots/videos для UI-змін.

## 7) Definition of Done for PR

PR вважається готовим, якщо:
- Відповідає architecture rules.
- Немає візуальної регресії.
- Проходить lint/build/check.
- Є обробка помилок для всіх нових API interactions.
- Оновлено docs (якщо змінено контракт/структуру).

## 8) Anti-patterns (заборонено)

- "Швидкий" код без перевірок і без docs.
- Дублювання однакової логіки у 2+ сторінках.
- Ручне парсення різних error-форматів у кожному компоненті.
- Непомітна зміна дизайну під виглядом рефакторингу.
- Великі PR без чітких меж scope.

## 9) Release hygiene

Перед merge у release-гілку:
- перевірити baseline parity checklist;
- перевірити known issues (чи щось нове не додали);
- коротко описати rollback план для ризикових змін.

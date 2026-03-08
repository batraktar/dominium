# Frontend Structure Standard (React)

Version: 1.0  
Date: 2026-02-15  
Scope: `frontend-react/src/*`

## 1) Мета
- Прибрати хаотичний ріст коду.
- Забезпечити однакову структуру для будь-якої нової фічі.
- Зберегти поточний дизайн/UX під час рефакторингу.

## 2) Принципи (обов'язково)
- UI parity first: спочатку стабільність і паритет, потім косметичні покращення.
- Feature-first структура: код організується за бізнес-функціями.
- Shared only for reusable: у `shared` тільки те, що повторно використовується.
- No cross-feature coupling: фіча не імпортує код іншої фічі напряму.
- Thin app shell: `App.jsx` тільки оркеструє роутинг/глобальний shell.

## 3) Цільова структура директорій

```text
frontend-react/src/
  app/
    AppShell.jsx
    routing.js
    providers/
  features/
    home/
      pages/
      components/
      hooks/
      services/
      model/
    search/
      pages/
      components/
      hooks/
      services/
      model/
    likes/
      pages/
      components/
      hooks/
      services/
      model/
    property/
      pages/
      components/
      hooks/
      services/
      model/
    map-test/
      pages/
      hooks/
      services/
      model/
    admin/
      pages/
      hooks/
      services/
      model/
    system/
      pages/
    auth/
      components/
      hooks/
      services/
      model/
  shared/
    api/
      client.js
      endpoints.js
      error-map.js
    ui/
      (спільні примітиви: Button, ModalShell, Spinner, EmptyState...)
    hooks/
      (глобальні хелпери: useBodyDataset, useToast, useMediaQuery...)
    utils/
      (url, formatters, guards...)
    constants/
    types/
  styles/
    base-fonts.css
    index.css
  main.jsx
```

## 4) Поточний стан і міграція без зламу

Поточні сторінки (`App.jsx`, `SearchPage.jsx`, `LikesPage.jsx`, `PropertyDetailPage.jsx`) **дозволені як transitional layer**.

Правило міграції:
1. Новий код одразу кладемо в `features/*`.
2. Старі файли чіпаємо тільки коли переносимо конкретний блок.
3. Після переносу блоків сторінка перетворюється на thin-page wrapper.

## 5) Межі імпорту (dependency boundaries)

Дозволено:
- `app -> features, shared`
- `features/<x> -> shared`
- `features/<x> -> features/<x>`
- `shared -> shared`

Заборонено:
- `shared -> features/*`
- `features/<a> -> features/<b>` (напряму)

Якщо потрібна взаємодія між фічами:
- робимо її через `app` (props/composition) або через `shared` контракт.

## 6) Правила для компонентів

- `pages/`: route-level композиція, без важкої бізнес-логіки.
- `components/`: локальні UI-блоки фічі.
- `hooks/`: side effects і state orchestration фічі.
- `services/`: API-виклики фічі (обгорнуті над `shared/api/client`).
- `model/`: мапери DTO, локальні селектори, типи стану.

Розбиття "коли виносити":
- >120 рядків JSX в одному компоненті -> винести підкомпонент.
- >2 `useEffect` із мережею/DOM ефектами -> винести в hook.
- повторюваний блок в 2+ місцях -> у `shared/ui` або feature-level reusable component.

## 7) Стайлінг і CSS

- Поточні класи Tailwind/legacy CSS зберігаємо.
- Глобальні стилі: тільки у `styles/*` або вже існуючих базових файлах.
- Feature-specific styles: поруч із фічею (`features/<x>/styles.css`) за потреби.
- Заборонено змінювати візуальну систему в рамках архітектурного рефактору.

## 8) Router/Navigation стандарт

- Внутрішні URL завжди в форматі path-only (`/search/`, `/property/:slug/`).
- Будь-які абсолютні URL з API нормалізуємо на frontend origin.
- Ніяких переходів у UI на `127.*` хости.

## 9) Data і side effects стандарт

- Всі HTTP виклики: через `shared/api/client`.
- CSRF bootstrap: централізовано, не дублювати по сторінках.
- Error mapping: централізовано (єдиний UX для помилок).
- Abort/cancel для запитів у живих пошукових сценаріях обов'язковий.
- Home-specific data loaders (`featured` та їх fallback/normalization) розміщуються у `features/home/{hooks,services,model}`, а не в `shared/hooks`.
- Search route scope (`/search/region/:slug`, `/search/city/:slug`) визначається з `pathname` у feature-model і передається в API як `region_slug`/`city_slug`.

## 10) Definition of Done для структурних змін

- Немає візуальних регресій (desktop/mobile parity checklist).
- `npm run lint` і `npm run build` проходять.
- Новий код не порушує import boundaries.
- Логіка винесена з page-level компонентів у features/hooks/services.

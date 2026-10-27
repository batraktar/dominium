# Customer journey та презентація об'єкта

## Межі

- DOMINIUM збирає лише продуктову телеметрію: сесію, джерело, UTM, локальний шлях і дозволений тип події.
- Після успішної заявки staff-аналітика прив'язує до сесії ім'я, нормалізований телефон/email та, для авторизованого відвідувача, user ID. Текст заявки, IP та довільний browser payload не записуються.
- CRM ідентифікатори та менеджер не потрапляють у публічні події або презентацію.

## Потік даних

1. React створює випадковий `session_id` у `localStorage` і один раз фіксує landing/referrer/UTM.
2. Дозволені події надсилаються на `POST /api/journey/events/` з унікальним `event_id`.
3. Django валідовує тип, локальні шляхи, довжини та зв'язки з об'єктом/статтею, застосовує rate limit і зберігає `JourneySession` та `JourneyEvent`.
4. `GET /api/admin/journey/analytics/` доступний лише staff і повертає воронку, джерела, топ-контент та останні маршрути.

## Події

- `page_view`, `search`, `property_view`, `article_view`
- `internal_click`, `favorite`, `contact_click`, `consultation`

Воронка: сесія → перегляд об'єкта → намір (`favorite` або `contact_click`) → `consultation`.

## Адмінські інструменти

- Вкладка «Аналітика» показує 7/28/90 днів і останні анонімні маршрути.
- Google Business Profile поки представлений інформаційною заглушкою без ключів і мережевої інтеграції.
- `GET /api/admin/properties/<id>/presentation/` формує staff-only HTML-презентацію об'єкта; браузерний друк створює PDF.

## Перевірка

- Backend: staff/non-staff, валідація подій, дедуплікація `event_id`, агрегація та захист презентації.
- Frontend: session/UTM model, lint, tests і production build.
- Runtime: фактичні POST/GET відповіді та відкриття презентації staff-користувачем.

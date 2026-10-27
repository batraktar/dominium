# Customer journey та презентація об'єкта

## Межі

- DOMINIUM розділяє постійного анонімного відвідувача, 30-хвилинний візит, вкладку та окрему подію.
- Після успішної заявки staff-аналітика прив'язує до відвідувача ім'я, нормалізований телефон/email та, для авторизованого відвідувача, user ID. Текст заявки й довільний browser payload не записуються.
- IP та user agent визначаються сервером, доступні лише staff; IP старше 30 днів анонімізує команда `anonymize_journey_ips`.
- CRM ідентифікатори та менеджер не потрапляють у публічні події або презентацію.

## Потік даних

1. React зберігає `visitor_id` у `localStorage`, ротує `visit_id` після 30 хвилин неактивності, а `tab_id` тримає у `sessionStorage`.
2. Дозволені події надсилаються на `POST /api/journey/events/` з унікальним `event_id`.
3. Django валідовує тип, локальні шляхи, довжини та зв'язки з об'єктом/статтею, застосовує rate limit і зберігає `JourneySession` та `JourneyEvent`.
4. `GET /api/admin/journey/analytics/` доступний лише staff і повертає воронку унікальних сесій, суцільний денний ряд, джерела, топ-контент та останні маршрути.

## Події

- `page_view`, `search`, `property_view`, `article_view`
- `internal_click`, `favorite`, `contact_click`, `consultation`
- `auth_start`, `auth_success`, `auth_failure`

Воронка: сесія → перегляд об'єкта → намір (`favorite` або `contact_click`) → `consultation`.

## Адмінські інструменти

- Вкладка «Аналітика» показує 7/28/90 днів, KPI, денний тренд, воронку конверсії, джерела, популярні об’єкти й останні маршрути. Графіки реалізовані легкими SVG/CSS без окремої chart-залежності.
- Google Business Profile поки представлений інформаційною заглушкою без ключів і мережевої інтеграції.
- `GET /api/admin/properties/<id>/presentation/` формує staff-only HTML-презентацію об'єкта; браузерний друк створює PDF.

## Перевірка

- Backend: staff/non-staff, валідація подій, дедуплікація `event_id`, агрегація та захист презентації.
- Frontend: visitor/visit/tab/UTM model, filters/path model, lint, tests і production build.
- Runtime: фактичні POST/GET відповіді та відкриття презентації staff-користувачем.

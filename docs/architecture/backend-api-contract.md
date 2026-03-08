# Backend API Contract Standard (Django)

Version: 1.0  
Date: 2026-02-15  
Scope: endpoints used by React frontend (`/api/*` + session auth endpoints used via XHR).

## 1) Мета
- Зафіксувати однозначний контракт між React і Django.
- Уніфікувати DTO і формат помилок.
- Прибрати "особливі випадки" у фронтенді для різних endpoint-ів.

## 2) Основні правила

- JSON-first для XHR/API запитів.
- Всі нові/оновлені endpoint-и повертають передбачуваний envelope.
- Редіректи дозволені лише для browser-form flow, не для XHR (`Accept: application/json` або `X-Requested-With`).
- HTTP status має відповідати семантиці помилки.

## 3) Стандартні response envelopes

## 3.1 Success (single)
```json
{
  "status": "ok",
  "result": {}
}
```

## 3.2 Success (list)
```json
{
  "status": "ok",
  "results": [],
  "count": 0,
  "page": 1,
  "total_pages": 1,
  "page_size": 10
}
```

`page/total_pages/page_size` обов'язкові тільки для пагінованих списків.

## 3.3 Error (generic)
```json
{
  "status": "error",
  "code": "validation_error",
  "message": "Некоректні дані",
  "errors": {
    "field_name": ["Повідомлення помилки"]
  }
}
```

Поле `errors` optional (для non-field помилок).

## 3.4 Error (auth)
```json
{
  "status": "error",
  "code": "auth_required",
  "message": "Authentication credentials were not provided."
}
```

## 4) HTTP status mapping (обов'язково)

- `200` OK — успішна операція читання/оновлення/видалення.
- `201` Created — новий ресурс створено.
- `207` Multi-Status — частковий успіх пакетної операції (наприклад, import).
- `400` Bad Request — невалідний payload/формат.
- `401` Unauthorized — потрібна авторизація.
- `403` Forbidden — доступ заборонений (role/permissions).
- `404` Not Found — ресурс відсутній.
- `409` Conflict — конфлікт стану/унікальності.
- `422` Unprocessable Entity — формат коректний, але доменні правила порушені.
- `429` Too Many Requests — rate limiting.
- `500/502` Server/Upstream errors.

## 5) DTO стандарт (v1)

## 5.1 PropertyDTO
```json
{
  "id": 1,
  "title": "string",
  "slug": "string",
  "description": "string",
  "address": "string",
  "latitude": 48.62,
  "longitude": 22.30,
  "location": { "address": "string", "latitude": 48.62, "longitude": 22.30 },
  "price": 125000.0,
  "price_info": { "amount": 125000.0, "currency": "USD" },
  "area": 92,
  "rooms": 3,
  "created_at": "ISO-8601",
  "is_archived": false,
  "featured_homepage": false,
  "property_type": { "id": 1, "name": "Квартира", "slug": "kvartyra" },
  "deal_type": { "id": 1, "name": "Продаж" },
  "features": [{ "id": 1, "name": "Балкон" }],
  "images": [{ "id": 11, "url": "https://...", "is_main": true }],
  "main_image": { "url": "https://..." },
  "absolute_url": "https://.../property/slug/"
}
```

## 5.2 PropertyTypeDTO
```json
{ "id": 1, "name": "Квартира", "slug": "kvartyra" }
```

## 5.3 DealTypeDTO
```json
{ "id": 1, "name": "Продаж" }
```

## 5.4 FeatureDTO
```json
{ "id": 1, "name": "Балкон" }
```

## 5.5 AuthUserDTO (for JSON login success)
```json
{
  "id": 10,
  "display_name": "Ім'я",
  "email": "user@example.com",
  "phone": "+380...",
  "is_staff": false
}
```

## 6) Request DTO стандарт (v1)

## 6.1 SearchPropertiesQuery
- `q`: string
- `property_type`: repeatable slug/id
- `region_slug`: slug (optional, only for `/search/region/:slug` scope)
- `city_slug`: slug (optional, only for `/search/city/:slug` scope)
- `price_min`, `price_max`: decimal
- `area_min`, `area_max`: int
- `rooms_min`, `rooms_max`: int
- `sort`: enum (`date`, `price_asc`, `price_desc`, `area_asc`, `area_desc`)
- `status`: enum (`active`, `archived`, `all`)
- `page`: int >= 1
- `page_size` or `per_page`: int (1..100)
- `currency`: enum (`USD`, `EUR`, `UAH`)

## 6.2 LoginRequest
```json
{
  "email": "email/username/telegram",
  "password": "string",
  "next": "/internal/path/"
}
```

`next` only internal path.

## 6.3 ConsultationRequest
```json
{
  "name": "string",
  "phone": "string",
  "email": "string or empty",
  "message": "string",
  "property": "/property/slug/"
}
```

## 7) Сумісність із поточним кодом (transition policy)

Поки триває міграція:
- Допускається існування старих полів (`detail`, `error`) на legacy endpoint-ах.
- Для endpoint-ів, які вже використовуються React-клієнтом, нові зміни робимо через стандартний envelope вище.
- Якщо змінюємо контракт, спочатку додаємо backward-compatible поля, потім прибираємо старі в наступній ітерації.

## 8) Обов'язкові backend правила реалізації

- Валідація:
  - field errors повертаються через `errors` словник.
  - зрозумілі повідомлення, не сирі traceback-тексти.
- Permissions:
  - читання публічних ресурсів явно дозволено.
  - write-операції — тільки staff/authorized roles.
- Security:
  - CSRF для session POST/PATCH/DELETE.
  - rate limit для дорогих/import endpoint-ів.
- Logging:
  - server-side exceptions логуються структуровано.

## 9) Контракт для API-помилок (короткий обов'язковий мінімум)

Кожна помилка повинна мати:
- `status: "error"`
- `code` (machine-readable)
- `message` (human-readable)

Рекомендовані `code`:
- `validation_error`
- `auth_required`
- `forbidden`
- `not_found`
- `rate_limited`
- `conflict`
- `server_error`
- `upstream_error`

## 10) Contract DoD

- Новий endpoint має описані request/response/error DTO.
- Є явний status code mapping.
- Frontend не містить endpoint-specific "костиль" для парсингу помилок.

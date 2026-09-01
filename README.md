# dominium-backend

Налаштування зовнішніх інтеграцій на production: [docs/integrations-hosting.md](docs/integrations-hosting.md).

Невеликий брокерський портал на Django з пошуком обʼєктів, імпортом презентацій,
Google/Telegram авторизацією, збереженими пошуками та блоком “Топ 3” для головної.

> Python module name: `dominium_backend` (underscore for Django import paths).

## Structure

```
dominium_backend/
├── accounts/                # користувачі, автентифікація, Telegram/Email реєстрація
├── house/
│   ├── api/                 # REST API (views + urls), логіка імпорту/парсингу
│   ├── services/            # бізнес-логіка (пошук, імпорт презентацій)
│   ├── utils/               # спільні сервіси (парсер HTML, курси валют)
│   └── views.py             # імпорт з презентації (службовий endpoint)
├── dominium_backend/
│   ├── settings/            # base/dev/prod конфіги, імпортуються через DJANGO_ENV
│   ├── views/               # public.py, search.py, auth.py, admin.py
│   └── forms.py             # form-level validation (consultation)
├── templates/               # Django templates (див. підкаталоги partials/, api/, …)
├── static/                  # статичні ресурси та JS для UI
├── manage.py
└── README.md (цю сторінку читаєш)
```

## Configuration

- **Base** конфігурація (`settings/base.py`) завантажує `.env` та читає змінні оточення:
  `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `DJANGO_DB_*`, `DJANGO_EMAIL_*`,
  `TELEGRAM_BOT_TOKEN`, `GOOGLE_CLIENT_ID/SECRET`, `EXCHANGE_RATES_URL`,
  `REQUESTS_TIMEOUT`, `CONSULTATION_RATE_LIMIT/WINDOW`, `IMPORT_RATE_LIMIT/WINDOW`,
  `IMPORT_REQUIRE_ALLOWED_HOSTS`, `IMPORT_ALLOWED_HOSTS`, `IMPORT_ALLOWED_IMAGE_HOSTS`,
  `LOGIN_RATE_LIMIT/WINDOW`, `ADMIN_IMAGE_MAX_BYTES/UPLOAD_MAX_FILES`,
  `DJANGO_TRUST_X_FORWARDED_FOR`, `DJANGO_TRUSTED_PROXY_IPS`,
  `DJANGO_ACCOUNT_EMAIL_REQUIRED`,
  `DJANGO_PERMISSIONS_POLICY`, `DJANGO_CROSS_ORIGIN_RESOURCE_POLICY`,
  `DJANGO_X_PERMITTED_CROSS_DOMAIN_POLICIES`, `DJANGO_ORIGIN_AGENT_CLUSTER`,
  `DJANGO_CSP_STRICT_REPORT_ONLY`, `DJANGO_CSP_REPORT_URI`,
  `DJANGO_CSP_REPORT_RATE_LIMIT/WINDOW`,
  `DJANGO_CONTENT_SECURITY_POLICY(_REPORT_ONLY)` тощо.
- React SPA runtime для мігрованих сторінок налаштовується через:
  - `REACT_SPA_DEV_SERVER_URL` (для DEBUG/HMR, напр. `http://localhost:5173`)
  - `REACT_SPA_ENTRY` (за замовчанням `index.html`)
  - `REACT_SPA_MANIFEST_PATH` (за замовчанням `frontend-react/dist/.vite/manifest.json`)
  - У `DEBUG=1` origin з `REACT_SPA_DEV_SERVER_URL` автоматично додається в `CSRF_TRUSTED_ORIGINS`.
- Canonical SEO host/scheme (рекомендовано для production) задаються через:
  - `SEO_CANONICAL_HOST` (напр. `dominiumrealty.com`)
  - `SEO_CANONICAL_SCHEME` (`https` або `http`, зазвичай `https`)
  - tracking query params (`utm_*`, `gclid`, `fbclid`, `msclkid`, `yclid`, `_ga`, `_gl`) автоматично прибираються з canonical URL для SSR SEO.
- `DJANGO_ENV` визначає, яку надбудову підключити:
  - `dev` (за умовчанням) — DEBUG, консольний email, localhost.
  - `prod` — вимагає секрети/hosts, вмикає HTTPS/hsts/secure cookies.
- CSP rollout:
  - `DJANGO_CSP_STRICT_REPORT_ONLY=1` (default) вмикає stricter policy у `Content-Security-Policy-Report-Only`.
  - `DJANGO_CSP_REPORT_URI=/_csp/report/` задає endpoint для browser violation reports.
  - `DJANGO_CSP_REPORT_RATE_LIMIT/WINDOW` обмежує частоту violation reports на backend.
- Browser security headers:
  - `DJANGO_PERMISSIONS_POLICY` контролює доступ до browser capabilities (default: блокує geolocation/fullscreen/camera/microphone і залишає `clipboard-write`/`web-share` для share UX).
  - `DJANGO_CROSS_ORIGIN_RESOURCE_POLICY=same-site` зменшує ризик небажаного cross-origin embedding ресурсів.
  - `DJANGO_X_PERMITTED_CROSS_DOMAIN_POLICIES=none` блокує legacy Adobe cross-domain policy.
  - `DJANGO_ORIGIN_AGENT_CLUSTER=?1` ізолює origin в окремий process cluster.
- Proxy/IP trust:
  - `DJANGO_TRUST_X_FORWARDED_FOR=1` вмикай тільки за reverse-proxy.
  - `DJANGO_TRUSTED_PROXY_IPS` задай явним allowlist-ом IP проксі; інакше `X-Forwarded-For` не використовується.
- Для додаткових середовищ створюй файл на зразок `settings/staging.py` та встановлюй `DJANGO_ENV=staging`.
- Шаблон конфігів у `.env.example` покриває всі змінні, потрібні для дев/прод середовищ.
- Не зберігай реальні ключі в git: копіюй `.env.example` або `.env.docker.example` і підставляй власні значення.

## API / імпорт

- REST-шари винесені до `house/api/`.
- Імпорт оголошень:
  - `/api/properties/import/` — JSON масив.
  - `/api/properties/import-html/` — завантажені HTML-файли.
  - `/api/properties/import-link/` — URL на презентацію.
- Парсер (`house/utils/html_parser.py`) нормалізує адресу (прибирає префікс «… район»,
  додає «Україна») та пробує кілька варіантів перед викликом Nominatim.
- Фото/галерея, що зчитані з презентацій, автоматично завантажуються в `PropertyImage`.
- URL-імпорт захищений allowlist-ом доменів:
  - `IMPORT_ALLOWED_HOSTS` — домени сторінок оголошень (CRM/listings).
  - `IMPORT_ALLOWED_IMAGE_HOSTS` — домени CDN фото (якщо відрізняються від CRM).
  - `IMPORT_REQUIRE_ALLOWED_HOSTS=1` блокує імпорт, доки allowlist не налаштовано.

## Розробка

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

- **Форматування**: використовується `black`. Перед комітом запускай
  `black accounts house dominium_backend manage.py telegram_bot.py`.
- **Перевірки**: `python manage.py check` (попередження allauth залишаються до оновлення конфігів).

### Один запуск для фронта + бека

```bash
make dev
```

Команда:
- створює `dominium-vm`, якщо його немає
- ставить backend-залежності з `requirements.dev.txt`
- ставить frontend-залежності в `frontend-react/`, якщо `node_modules` ще немає
- виконує `python manage.py migrate`
- запускає Django на `http://127.0.0.1:8000`
- запускає React/Vite на `http://127.0.0.1:5173`
- автоматично прокидає `REACT_SPA_DEV_SERVER_URL` і `VITE_BACKEND_URL`

Окремі команди:

```bash
make dev-backend
make dev-frontend
```

## Продакшн

```bash
export DJANGO_ENV=prod
export DJANGO_SECRET_KEY="..."
export DJANGO_ALLOWED_HOSTS="example.com,www.example.com"
python manage.py collectstatic --noinput
python manage.py migrate
```

- Налаштуй `DJANGO_CSRF_TRUSTED_ORIGINS` та SMTP/Telegram змінні.
- Для балансувальника через HTTPS переконайся, що проксі передає `X-Forwarded-Proto`
  (у `prod.py` вже задано `SECURE_PROXY_SSL_HEADER`).

## Корисні скрипти

- `black …` — форматування кодової бази.
- `python manage.py shell` + `parse_property_from_html(path, geocode_missing=True)` — тест імпорту.
- `python manage.py createsuperuser` — адмін-доступ безпосередньо в Django admin.

## How to run

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

## Tests

```bash
python manage.py test house dominium_backend
python manage.py check
```

## SEO smoke check

Перед релізом SPA-маршрутів проганяй швидку перевірку SEO-контрактів:

```bash
./scripts/seo_smoke_check.sh http://localhost:8000
```

Для перевірки конкретної сторінки обʼєкта додай env `PROPERTY_PATH`:

```bash
PROPERTY_PATH=/property/<your-slug>/ ./scripts/seo_smoke_check.sh http://localhost:8000
```

Для контролю canonical-домену в smoke-check:

```bash
EXPECTED_CANONICAL_HOST=dominiumrealty.com EXPECTED_CANONICAL_SCHEME=https ./scripts/seo_smoke_check.sh https://dominiumrealty.com
```

## Highlights
- Пошук з динамічним фільтром, лайками, асинхронним оновленням карток та валютними конверсіями.
- Імпорт презентацій/HTML/URL у форматі Property + галерея; конвертація у WebP; staff-only + rate limiting.
- Авторизація Google/Telegram, збережені пошуки, блок “Топ 3” з API-адмінкою.
- SEO/OG/Structured Data, sitemap/robots, маніфест/фавікони.
- Оптимізація БД: індекси на featured_homepage, is_archived, price, created_at, deal_type, property_type.

## Docker
- Створити `.env.docker` з базою на прикладі `.env.docker.example`.
- `docker compose up --build` підніме web (gunicorn + whitenoise), Postgres та nginx зі статикою.
- Вхідна точка застосунку: `http://localhost`.

## CI/CD
- Workflow `.github/workflows/ci.yml`: black/isort чек, `manage.py check`, тести, валідація `docker-compose.yml`.
- Для бейджа у README заміни `USER/REPO`:\
  `![CI](https://github.com/USER/REPO/actions/workflows/ci.yml/badge.svg)`

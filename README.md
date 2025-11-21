# Dominium Realty

Невеликий брокерський портал на Django з пошуком обʼєктів, імпортом презентацій,
Google/Telegram авторизацією, збереженими пошуками та блоком “Топ 3” для головної.

## Structure

```
landing_doominium_real_state/
├── accounts/                # користувачі, автентифікація, Telegram/Email реєстрація
├── house/
│   ├── api/                 # REST API (views + urls), логіка імпорту/парсингу
│   ├── services/            # бізнес-логіка (пошук, імпорт презентацій)
│   ├── utils/               # спільні сервіси (парсер HTML, курси валют)
│   └── views.py             # імпорт з презентації (службовий endpoint)
├── landing_doominium_real_state/
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
  `REQUESTS_TIMEOUT`, `CONSULTATION_RATE_LIMIT/WINDOW`, `IMPORT_RATE_LIMIT/WINDOW` тощо.
- `DJANGO_ENV` визначає, яку надбудову підключити:
  - `dev` (за умовчанням) — DEBUG, консольний email, localhost.
  - `prod` — вимагає секрети/hosts, вмикає HTTPS/hsts/secure cookies.
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

## Розробка

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

- **Форматування**: використовується `black`. Перед комітом запускай
  `black accounts house landing_doominium_real_state manage.py telegram_bot.py`.
- **Перевірки**: `python manage.py check` (попередження allauth залишаються до оновлення конфігів).

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
python manage.py test house landing_doominium_real_state
python manage.py check
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

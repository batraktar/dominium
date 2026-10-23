# Підключення Realtsoft і Google на хостингу

Зовнішні ключі використовує тільки Django-сервер. Їх не потрібно додавати у Vite, React або `VITE_*` змінні.

## 1. Мінімальна конфігурація хостингу

У корені проєкту, поруч із `manage.py`, створіть `.env` або задайте ті самі змінні в панелі хостингу:

```env
DJANGO_ENV=prod
DJANGO_SECRET_KEY=довгий-випадковий-секрет
DJANGO_ALLOWED_HOSTS=example.com,www.example.com
DJANGO_CSRF_TRUSTED_ORIGINS=https://example.com,https://www.example.com
SEO_CANONICAL_HOST=example.com
SEO_CANONICAL_SCHEME=https
```

Дані бази, пошти та інші production-змінні заповнюються за шаблоном `.env.docker.example`. Значення, які задає сам хостинг, мають пріоритет над `.env`.

Після зміни `.env` перезапустіть Python/Passenger застосунок у панелі хостингу. Потім виконайте:

```sh
dominium-vm/bin/python manage.py migrate
dominium-vm/bin/python manage.py collectstatic --noinput
```

## 2. Realtsoft через приватну адмінку

1. Відкрийте `https://example.com/api/admin/` і перейдіть у `Налаштування → CRM`.
2. Вкажіть URL проєкту без `/api`, наприклад `https://your-project.realtsoft.net`.
3. Вставте API Key і Secret Key, увімкніть синхронізацію та збережіть.
4. Натисніть `Тест`. Успіх означає, що сервер хостингу зміг авторизуватися та прочитати об’єкти Realtsoft.

Секрет після збереження не повертається у браузер. Значення з адмінки мають пріоритет над `REALTSOFT_*` із `.env`; env-значення лишаються резервним bootstrap-варіантом.

Для ручної серверної перевірки:

```sh
dominium-vm/bin/python manage.py check_realtsoft
dominium-vm/bin/python manage.py sync_crm_properties --dry-run --max-pages 1
```

Для автоматичної синхронізації додайте cron у панелі хостингу. Приклад кожні 30 хвилин:

```cron
*/30 * * * * /absolute/path/to/dominium/scripts/sync_crm_cron.sh
```

Інтервал у формі адмінки є підказкою для цього cron. Сам сайт навмисно не змінює системний планувальник хостингу.

## 3. Google-вхід

1. У Google Cloud Console створіть OAuth Client типу `Web application`.
2. Додайте `https://example.com` до Authorized JavaScript origins.
3. Задайте `GOOGLE_CLIENT_ID` у production `.env`. React використовує Google Identity Services, а Django перевіряє credential саме для цього client ID і створює звичайну Django-сесію.
4. `GOOGLE_CLIENT_SECRET` та allauth redirect URI залишаються для резервного redirect-flow. Основний GIS-вхід працює у поточній вкладці без повного перезавантаження SPA після успіху.

Якщо резервний allauth-flow налаштовується через приватну адмінку, його secret зберігається у стандартній моделі `django-allauth`, прив’язаній до поточного Django Site, і маскується у відповідях API.

## 4. Google Search Console у React-адмінці

1. У Google Cloud увімкніть Google Search Console API й створіть окремий service account без зайвих ролей проєкту.
2. У Search Console відкрийте domain property `sc-domain:dominium.com.ua` → `Налаштування` → `Користувачі та дозволи` та додайте email service account з доступом на читання.
3. Повний JSON ключа передайте лише через захищену server-side змінну `GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON` (одним рядком). Не вставляйте його в Git, React, чат або журнали.
4. Задайте:

```env
GOOGLE_SEARCH_CONSOLE_SITE_URL=sc-domain:dominium.com.ua
GOOGLE_SEARCH_CONSOLE_CACHE_SECONDS=900
```

Після перезапуску відкрийте `/api/admin/` → `Пошук Google`. Endpoint використовує лише scope `webmasters.readonly`; неавторизовані й non-staff користувачі отримують 404. Якщо ключ відсутній, staff бачить безпечний стан «не налаштовано». Дані Search Console не realtime й зазвичай відстають на 2–3 дні.

## 5. Що перевірити після розгортання

```sh
dominium-vm/bin/python manage.py check --deploy
dominium-vm/bin/python manage.py check_realtsoft
```

У вкладці `Статус` перевірте production mode, SEO canonical, Google OAuth і CRM. Якщо команда Realtsoft завершується помилкою, cron також поверне ненульовий exit code, тому хостинг більше не позначатиме невдалу синхронізацію як успішну.

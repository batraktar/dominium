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

## 3. Google OAuth через приватну адмінку

1. У Google Cloud Console створіть OAuth Client типу `Web application`.
2. Додайте `https://example.com` до Authorized JavaScript origins.
3. Скопіюйте точний Authorized redirect URI, показаний у `Налаштування → Google`.
4. Вставте Client ID і Client Secret у цій вкладці та збережіть.

Google-ключі зберігаються у стандартній моделі `django-allauth` і прив’язуються до поточного Django Site. Secret маскується у відповідях адмінського API.

## 4. Що перевірити після розгортання

```sh
dominium-vm/bin/python manage.py check --deploy
dominium-vm/bin/python manage.py check_realtsoft
```

У вкладці `Статус` перевірте production mode, SEO canonical, Google OAuth і CRM. Якщо команда Realtsoft завершується помилкою, cron також поверне ненульовий exit code, тому хостинг більше не позначатиме невдалу синхронізацію як успішну.

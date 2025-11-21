FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        default-libmysqlclient-dev \
        pkg-config \
        curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn psycopg2-binary

COPY . .

ENV DJANGO_SETTINGS_MODULE=landing_doominium_real_state.settings.prod
EXPOSE 8000

CMD ["gunicorn", "landing_doominium_real_state.wsgi:application", "--bind", "0.0.0.0:8000"]

FROM node:22-alpine AS frontend-build

WORKDIR /frontend-react

COPY frontend-react/package.json frontend-react/package-lock.json ./
RUN npm ci

COPY frontend-react/ ./
COPY static/ /static/
RUN npm run build \
    && test -s dist/.vite/manifest.json


FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        default-libmysqlclient-dev \
        fonts-dejavu-core \
        pkg-config \
        curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn psycopg2-binary

COPY . .
COPY --from=frontend-build /frontend-react/dist ./frontend-react/dist

ENV DJANGO_SETTINGS_MODULE=dominium_backend.settings.prod
EXPOSE 8000

CMD ["gunicorn", "dominium_backend.wsgi:application", "--bind", "0.0.0.0:8000"]

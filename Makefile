SHELL := /bin/sh

.PHONY: dev dev-backend dev-frontend

dev:
	./scripts/dev_full_stack.sh

dev-backend:
	python manage.py runserver 127.0.0.1:8000

dev-frontend:
	cd frontend-react && npm run dev -- --host 127.0.0.1 --port 5173

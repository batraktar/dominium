from __future__ import annotations

from urllib.parse import urlsplit

from django.core.management.base import BaseCommand, CommandError

from house.services.realtsoft_client import RealtsoftAPIError, get_realtsoft_client


class Command(BaseCommand):
    help = "Перевірити конфігурацію та read-only підключення до Realtsoft API"

    def handle(self, *args, **options) -> None:
        try:
            client = get_realtsoft_client()
            response = client.search_estate(page=1, per_page=1)
        except RealtsoftAPIError as exc:
            raise CommandError(f"Realtsoft API недоступний: {exc}") from exc

        items = (
            response
            if isinstance(response, list)
            else response.get("data") or response.get("items") or []
        )
        host = urlsplit(client.url).hostname or client.url
        self.stdout.write(
            self.style.SUCCESS(
                f"Realtsoft API підключено: {host}; отримано об'єктів: {len(items)}"
            )
        )

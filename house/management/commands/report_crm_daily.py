from __future__ import annotations

import html
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Final
from zoneinfo import ZoneInfo

import requests
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from house.models import Property

logger = logging.getLogger(__name__)

SITE_URL: Final[str] = "https://dominium.com.ua"
REPORT_LIMIT: Final[int] = 8
KYIV_TIME_ZONE: Final = ZoneInfo("Europe/Kyiv")


@dataclass(frozen=True, slots=True)
class ReportSnapshot:
    properties: tuple[Property, ...]
    total: int
    generated_at: datetime
    sync_exit_code: int


class Command(BaseCommand):
    help = "Надіслати в Telegram добовий звіт про нові об'єкти Realtsoft."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--sync-exit-code", type=int, default=0)
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options) -> None:
        token = settings.TELEGRAM_BOT_TOKEN
        chat_ids = tuple(
            int(chat_id.strip())
            for chat_id in os.getenv("TELEGRAM_REPORT_CHAT_IDS", "").split(",")
            if chat_id.strip()
        )
        if not token or not chat_ids:
            raise CommandError("Telegram-звіти не налаштовані.")

        window_start = timezone.now() - timedelta(hours=24)
        generated_at = timezone.localtime(timezone.now(), KYIV_TIME_ZONE)
        property_query = Property.objects.filter(
            external_source="realtsoft",
            is_archived=False,
            created_at__gte=window_start,
        ).select_related("property_type", "deal_type")
        properties = tuple(property_query.order_by("-created_at")[: REPORT_LIMIT + 1])
        snapshot = ReportSnapshot(
            properties=properties[:REPORT_LIMIT],
            total=property_query.count(),
            generated_at=generated_at,
            sync_exit_code=options["sync_exit_code"],
        )
        message = self._build_message(snapshot)
        if options["dry_run"]:
            self.stdout.write(message)
            return

        failures: list[int] = []
        with requests.Session() as client:
            for chat_id in chat_ids:
                try:
                    response = client.post(
                        f"https://api.telegram.org/bot{token}/sendMessage",
                        json={
                            "chat_id": chat_id,
                            "text": message,
                            "parse_mode": "HTML",
                            "disable_web_page_preview": True,
                        },
                        timeout=(5, 30),
                    )
                    response.raise_for_status()
                    if not response.json().get("ok"):
                        failures.append(chat_id)
                except (requests.RequestException, ValueError):
                    logger.warning("Telegram daily report delivery failed for chat %s", chat_id)
                    failures.append(chat_id)

        if failures:
            raise CommandError(
                "Не вдалося надіслати Telegram-звіт у чат(и): "
                + ", ".join(str(chat_id) for chat_id in failures)
            )
        self.stdout.write(self.style.SUCCESS(f"Добовий звіт надіслано: {len(chat_ids)} чат(и)."))

    def _build_message(self, snapshot: ReportSnapshot) -> str:
        lines = [
            "<b>DOMINIUM  /  ПІДСУМОК ДНЯ</b>",
            html.escape(snapshot.generated_at.strftime("%d.%m.%Y · %H:%M")),
            "",
            f"Нових об'єктів за 24 години: <b>{snapshot.total}</b>",
        ]
        if snapshot.sync_exit_code:
            lines.extend(
                [
                    "",
                    "<b>Перевірка CRM завершилась з помилкою.</b> "
                    "Перегляньте журнал синхронізації.",
                ]
            )

        for index, property_obj in enumerate(snapshot.properties, start=1):
            deal = property_obj.deal_type.name if property_obj.deal_type else "Об'єкт"
            property_type = (
                property_obj.property_type.name
                if property_obj.property_type
                else "Нерухомість"
            )
            price = f"{property_obj.price:,.0f} {property_obj.price_currency}".replace(",", " ")
            details = [price]
            if property_obj.area:
                details.append(f"{property_obj.area} м²")
            if property_obj.rooms:
                details.append(f"{property_obj.rooms} кімн.")
            url = f"{SITE_URL}{property_obj.get_absolute_url()}"
            lines.extend(
                [
                    "",
                    f"<b>{index}. {html.escape(deal)} · {html.escape(property_type)}</b>",
                    html.escape(property_obj.address[:180]),
                    html.escape(" · ".join(details)),
                    f'<a href="{html.escape(url, quote=True)}">Відкрити об’єкт</a>',
                ]
            )

        if not snapshot.total:
            lines.extend(["", "За останню добу нових об’єктів не з’явилося."])
        elif snapshot.total > REPORT_LIMIT:
            lines.extend(["", f"Показано {REPORT_LIMIT} із {snapshot.total} нових об’єктів."])

        return "\n".join(lines)

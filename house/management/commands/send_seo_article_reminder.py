from __future__ import annotations

import html
import logging
from datetime import datetime
from zoneinfo import ZoneInfo

import requests
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from house.models import AppSettings, Article

logger = logging.getLogger(__name__)
KYIV_TIME_ZONE = ZoneInfo("Europe/Kyiv")
DEFAULT_MESSAGE = (
    "Час підготувати корисну SEO-статтю для DOMINIUM: перевірте тему, "
    "джерела, фото, метадані та опублікуйте лише після редакторської перевірки."
)


def _parse_chat_ids(value) -> tuple[int, ...]:
    if isinstance(value, (list, tuple)):
        parts = value
    else:
        parts = str(value or "").replace(";", ",").split(",")
    result = []
    for part in parts:
        try:
            result.append(int(str(part).strip()))
        except (TypeError, ValueError):
            continue
    return tuple(dict.fromkeys(result))


class Command(BaseCommand):
    help = "Надіслати налаштоване нагадування про рекламні SEO-статті."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--force", action="store_true")

    def handle(self, *args, **options):
        telegram = AppSettings.get("telegram", {})
        if not isinstance(telegram, dict) or not telegram.get("seo_reminder_enabled"):
            self.stdout.write("SEO-нагадування вимкнене.")
            return

        now = timezone.localtime(timezone.now(), KYIV_TIME_ZONE)
        weekdays = telegram.get("seo_reminder_weekdays") or [0]
        weekdays = {int(day) for day in weekdays if str(day).isdigit()}
        scheduled_time = str(telegram.get("seo_reminder_time") or "10:00")
        try:
            hour, minute = (int(value) for value in scheduled_time.split(":", 1))
        except (TypeError, ValueError):
            raise CommandError("Некоректний час SEO-нагадування. Очікується HH:MM.")

        due = now.weekday() in weekdays and now.hour == hour and now.minute >= minute
        state = AppSettings.get("seo_article_reminder_state", {})
        already_sent = isinstance(state, dict) and state.get("last_sent_on") == now.date().isoformat()
        if not options["force"] and (not due or already_sent):
            self.stdout.write("SEO-нагадування зараз не заплановане або вже надіслане.")
            return

        chat_ids = _parse_chat_ids(telegram.get("seo_reminder_chat_ids"))
        token = str(telegram.get("bot_token") or settings.TELEGRAM_BOT_TOKEN).strip()
        if not token or not chat_ids:
            raise CommandError("Для SEO-нагадування потрібні bot token і Chat ID.")

        drafts = Article.objects.filter(is_published=False).count()
        message = str(telegram.get("seo_reminder_message") or DEFAULT_MESSAGE).strip()
        text = (
            "<b>DOMINIUM · SEO-статті</b>\n\n"
            f"{html.escape(message)}\n\n"
            f"Чернеток у редакції: <b>{drafts}</b>"
        )
        if options["dry_run"]:
            self.stdout.write(text)
            return

        failures = []
        for chat_id in chat_ids:
            try:
                response = requests.post(
                    f"https://api.telegram.org/bot{token}/sendMessage",
                    json={
                        "chat_id": chat_id,
                        "text": text,
                        "parse_mode": "HTML",
                        "disable_web_page_preview": True,
                    },
                    timeout=(5, 30),
                )
                response.raise_for_status()
            except requests.RequestException:
                logger.warning("SEO reminder delivery failed for chat %s", chat_id)
                failures.append(chat_id)
        if failures:
            raise CommandError("Не вдалося надіслати нагадування в окремі чати.")

        AppSettings.set(
            "seo_article_reminder_state",
            {"last_sent_on": now.date().isoformat(), "sent_at": datetime.isoformat(now)},
        )
        self.stdout.write(self.style.SUCCESS(f"SEO-нагадування надіслано: {len(chat_ids)} чат(и)."))

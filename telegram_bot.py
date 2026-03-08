import os

import django
from asgiref.sync import sync_to_async  # ← ось що додаємо
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

# Імпорт налаштувань Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "dominium_backend.settings")
django.setup()

from accounts.models import CustomUser, TelegramVerification

# 🔐 Токен бота з BotFather
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()

if not BOT_TOKEN or BOT_TOKEN.lower() == "changeme":
    raise RuntimeError(
        "TELEGRAM_BOT_TOKEN відсутній або встановлений у значення за замовчуванням "
        "«changeme». Додайте коректний токен бота до .env або змінних середовища."
    )


# 👇 Ця функція буде безпечно працювати з ORM у async-контексті
@sync_to_async
def get_verification_for_user(tg_username):
    user = CustomUser.objects.get(telegram_username=tg_username)
    verification = TelegramVerification.objects.filter(user=user, is_used=False).latest(
        "created_at"
    )
    return verification


@sync_to_async
def ensure_user_full_name(user_id, full_name):
    if not full_name:
        return
    normalized = full_name.strip()
    if not normalized:
        return
    user = (
        CustomUser.objects.filter(pk=user_id)
        .only("full_name", "telegram_username", "username")
        .first()
    )
    if not user:
        return
    current = (user.full_name or "").strip()
    if current and current not in {user.telegram_username or "", user.username or ""}:
        return
    CustomUser.objects.filter(pk=user_id).update(full_name=normalized)


# 👋 Обробка команди /start
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    tg_username = update.effective_user.username

    try:
        verification = await get_verification_for_user(tg_username)
    except CustomUser.DoesNotExist:
        await update.message.reply_text(
            "❌ Користувача з таким telegram_username не знайдено. Зареєструйся на сайті."
        )
        return
    except TelegramVerification.DoesNotExist:
        await update.message.reply_text("⚠️ Тобі ще не згенеровано код підтвердження.")
        return

    await ensure_user_full_name(
        verification.user_id,
        update.effective_user.full_name
        or update.effective_user.first_name
        or update.effective_user.last_name,
    )

    # 🔗 Кнопка для підтвердження акаунта
    confirm_url = (
        f"http://dominium.com.ua/verify/{verification.code}/"  # ← виправлено на http
    )
    button = InlineKeyboardButton("✅ Підтвердити акаунт", url=confirm_url)
    markup = InlineKeyboardMarkup([[button]])

    await update.message.reply_text(
        "👋 Привіт! Натисни кнопку нижче, щоб підтвердити реєстрацію:",
        reply_markup=markup,
    )


# 🚀 Запуск бота
if __name__ == "__main__":
    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    print("✅ Бот запущено. Очікуємо /start...")
    app.run_polling()

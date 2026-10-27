from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("house", "0017_journeysession_customer_identity")]

    operations = [
        migrations.AddField(
            model_name="journeysession", name="visitor_id",
            field=models.CharField(blank=True, db_index=True, max_length=64),
        ),
        migrations.AddField(
            model_name="journeysession", name="ip_address",
            field=models.GenericIPAddressField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name="journeysession", name="user_agent",
            field=models.CharField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name="journeyevent", name="tab_id",
            field=models.CharField(blank=True, db_index=True, max_length=64),
        ),
        migrations.AlterField(
            model_name="journeyevent", name="event_type",
            field=models.CharField(choices=[
                ("page_view", "Перегляд сторінки"), ("search", "Пошук"),
                ("property_view", "Перегляд об'єкта"), ("article_view", "Перегляд статті"),
                ("internal_click", "Внутрішній перехід"), ("favorite", "Обране"),
                ("contact_click", "Контакт"), ("consultation", "Заявка"),
                ("auth_start", "Початок входу"), ("auth_success", "Успішний вхід"),
                ("auth_failure", "Помилка входу"),
            ], db_index=True, max_length=32),
        ),
    ]

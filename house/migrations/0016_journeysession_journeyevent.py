import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("house", "0015_externalproperty_is_import_eligible")]

    operations = [
        migrations.CreateModel(
            name="JourneySession",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("session_id", models.CharField(max_length=64, unique=True)),
                ("first_path", models.CharField(blank=True, max_length=500)),
                ("referrer_host", models.CharField(blank=True, max_length=255)),
                ("utm_source", models.CharField(blank=True, max_length=100)),
                ("utm_medium", models.CharField(blank=True, max_length=100)),
                ("utm_campaign", models.CharField(blank=True, max_length=150)),
                ("utm_content", models.CharField(blank=True, max_length=150)),
                ("utm_term", models.CharField(blank=True, max_length=150)),
                ("first_seen_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("last_seen_at", models.DateTimeField(auto_now=True, db_index=True)),
            ],
            options={"ordering": ["-last_seen_at"]},
        ),
        migrations.CreateModel(
            name="JourneyEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("event_id", models.UUIDField(editable=False, unique=True)),
                ("event_type", models.CharField(choices=[("page_view", "Перегляд сторінки"), ("search", "Пошук"), ("property_view", "Перегляд об'єкта"), ("article_view", "Перегляд статті"), ("internal_click", "Внутрішній перехід"), ("favorite", "Обране"), ("contact_click", "Контакт"), ("consultation", "Заявка")], db_index=True, max_length=32)),
                ("path", models.CharField(max_length=500)),
                ("target_path", models.CharField(blank=True, max_length=500)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("article", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="house.article")),
                ("property", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="house.property")),
                ("session", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="events", to="house.journeysession")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(model_name="journeyevent", index=models.Index(fields=["session", "created_at"], name="house_journ_session_6b13e1_idx")),
        migrations.AddIndex(model_name="journeyevent", index=models.Index(fields=["event_type", "created_at"], name="house_journ_event_t_77babb_idx")),
    ]

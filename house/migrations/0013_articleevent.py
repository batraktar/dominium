from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("house", "0012_searchconsolesettings")]

    operations = [
        migrations.CreateModel(
            name="ArticleEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("session_id", models.CharField(db_index=True, max_length=64)),
                ("event_type", models.CharField(choices=[("view", "Перегляд статті"), ("internal_click", "Перехід зі статті"), ("site_page_view", "Наступна сторінка"), ("favorite", "Додавання в обране"), ("consultation", "Заявка")], db_index=True, max_length=24)),
                ("target_path", models.CharField(blank=True, max_length=500)),
                ("property_id", models.PositiveIntegerField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("article", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="events", to="house.article")),
            ],
        ),
        migrations.AddIndex(model_name="articleevent", index=models.Index(fields=["article", "created_at"], name="house_artic_article_05563c_idx")),
        migrations.AddConstraint(model_name="articleevent", constraint=models.UniqueConstraint(fields=("article", "session_id", "event_type", "target_path", "property_id"), name="unique_article_journey_event")),
    ]

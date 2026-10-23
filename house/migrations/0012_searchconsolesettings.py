from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("house", "0011_articleimage")]

    operations = [
        migrations.CreateModel(
            name="SearchConsoleSettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("site_url", models.CharField(default="sc-domain:dominium.com.ua", max_length=255)),
                ("service_account_json", models.TextField(blank=True)),
                ("cache_seconds", models.PositiveIntegerField(default=900)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"verbose_name": "Google Search Console", "verbose_name_plural": "Google Search Console"},
        )
    ]

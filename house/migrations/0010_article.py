from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("house", "0009_add_settings_and_templates")]

    operations = [
        migrations.CreateModel(
            name="Article",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=200)),
                ("slug", models.SlugField(max_length=220, unique=True)),
                ("summary", models.CharField(max_length=500)),
                ("body", models.TextField()),
                ("cover_image", models.ImageField(blank=True, upload_to="article_covers/")),
                ("seo_title", models.CharField(blank=True, max_length=200)),
                ("seo_description", models.CharField(blank=True, max_length=320)),
                ("is_published", models.BooleanField(db_index=True, default=False)),
                ("published_at", models.DateTimeField(blank=True, db_index=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["-published_at", "-updated_at"]},
        )
    ]

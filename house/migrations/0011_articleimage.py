from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("house", "0010_article")]

    operations = [
        migrations.CreateModel(
            name="ArticleImage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("image", models.ImageField(upload_to="article_images/")),
                ("alt_text", models.CharField(blank=True, max_length=200)),
                ("caption", models.CharField(blank=True, max_length=500)),
                ("sort_order", models.PositiveIntegerField(default=0)),
                ("article", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="images", to="house.article")),
            ],
            options={"ordering": ["sort_order", "id"]},
        )
    ]

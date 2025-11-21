from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_customuser_phone_number_savedsearch"),
    ]

    operations = [
        migrations.AddField(
            model_name="customuser",
            name="full_name",
            field=models.CharField(blank=True, max_length=255),
        ),
    ]

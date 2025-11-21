from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("house", "0003_property_is_archived"),
    ]

    operations = [
        migrations.AddField(
            model_name="propertyimage",
            name="sort_order",
            field=models.PositiveIntegerField(default=0),
        ),
    ]

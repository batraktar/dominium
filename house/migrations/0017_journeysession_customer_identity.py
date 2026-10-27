import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0004_alter_customuser_options"),
        ("house", "0016_journeysession_journeyevent"),
    ]

    operations = [
        migrations.AddField(model_name="journeysession", name="customer_email", field=models.EmailField(blank=True, db_index=True, max_length=254)),
        migrations.AddField(model_name="journeysession", name="customer_name", field=models.CharField(blank=True, max_length=150)),
        migrations.AddField(model_name="journeysession", name="customer_phone", field=models.CharField(blank=True, db_index=True, max_length=30)),
        migrations.AddField(model_name="journeysession", name="user", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="journey_sessions", to="accounts.customuser")),
    ]

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("trips", "0005_enable_pg_trgm"),
    ]

    operations = [
        migrations.AddField(
            model_name="trip",
            name="highlights",
            field=models.JSONField(blank=True, default=list),
        ),
    ]

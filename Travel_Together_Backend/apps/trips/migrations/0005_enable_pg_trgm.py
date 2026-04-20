from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("trips", "0004_add_reported_user_to_incidentreport"),
    ]

    operations = [
        migrations.RunSQL(
            "CREATE EXTENSION IF NOT EXISTS pg_trgm;",
            reverse_sql="DROP EXTENSION IF EXISTS pg_trgm;",
        ),
    ]

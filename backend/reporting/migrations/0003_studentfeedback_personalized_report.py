from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("reporting", "0002_structured_class_reports"),
    ]

    operations = [
        migrations.AddField(
            model_name="studentfeedback",
            name="personalized_report",
            field=models.TextField(blank=True, default=""),
        ),
    ]

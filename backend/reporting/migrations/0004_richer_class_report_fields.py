from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("reporting", "0003_studentfeedback_personalized_report"),
    ]

    operations = [
        migrations.AddField(
            model_name="classreport",
            name="learning_goals",
            field=models.TextField(blank=True, default="", max_length=1000),
        ),
        migrations.AddField(
            model_name="classreport",
            name="key_concepts",
            field=models.TextField(blank=True, default="", max_length=1500),
        ),
        migrations.AddField(
            model_name="classreport",
            name="next_lesson",
            field=models.TextField(blank=True, default="", max_length=1000),
        ),
        migrations.AddField(
            model_name="classreport",
            name="materials",
            field=models.TextField(blank=True, default="", max_length=1000),
        ),
    ]

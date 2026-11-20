from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("reporting", "0004_richer_class_report_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="classreport",
            name="reporting_period",
            field=models.CharField(blank=True, default="", max_length=50),
        ),
        migrations.AddField(
            model_name="studentfeedback",
            name="email_status",
            field=models.CharField(
                choices=[("pending", "Pending"), ("sent", "Sent"), ("failed", "Failed"), ("skipped", "Skipped")],
                default="pending",
                max_length=12,
            ),
        ),
        migrations.AddField(
            model_name="studentfeedback",
            name="email_attempts",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="studentfeedback",
            name="email_sent_on",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="studentfeedback",
            name="email_error",
            field=models.TextField(blank=True, default=""),
        ),
    ]

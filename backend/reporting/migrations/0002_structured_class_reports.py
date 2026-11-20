from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("reporting", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="classreport",
            name="title",
            field=models.CharField(blank=True, default="", max_length=50),
        ),
        migrations.AlterField(
            model_name="classreport",
            name="body",
            field=models.TextField(blank=True, default="", max_length=1000),
        ),
        migrations.AddField(
            model_name="classreport",
            name="topic_taught",
            field=models.TextField(blank=True, default="", max_length=500),
        ),
        migrations.AddField(
            model_name="classreport",
            name="activities",
            field=models.TextField(blank=True, default="", max_length=1000),
        ),
        migrations.AddField(
            model_name="classreport",
            name="practical_works",
            field=models.TextField(blank=True, default="", max_length=1000),
        ),
        migrations.AddField(
            model_name="classreport",
            name="assignment",
            field=models.TextField(blank=True, default="", max_length=1000),
        ),
        migrations.AddField(
            model_name="classreport",
            name="assignment_due_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="studentfeedback",
            name="feedback",
            field=models.TextField(blank=True, default="", max_length=500),
        ),
        migrations.AddField(
            model_name="studentfeedback",
            name="report",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="student_feedback", to="reporting.classreport"),
        ),
        migrations.AddField(
            model_name="studentfeedback",
            name="answers",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="studentfeedback",
            name="note",
            field=models.TextField(blank=True, default="", max_length=500),
        ),
        migrations.AddConstraint(
            model_name="studentfeedback",
            constraint=models.UniqueConstraint(fields=("report", "enrollment"), name="one_feedback_per_report_enrollment"),
        ),
    ]

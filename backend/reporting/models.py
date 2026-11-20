from django.db import models

# Create your models here.

class ClassReport(models.Model):
    class Status(models.TextChoices):
        DRAFT= "draft", "Draft"
        PUBLISHED = "published", "Published"

    author = models.ForeignKey("accounts.InstructorProfile", on_delete=models.PROTECT, related_name="class_report")
    classroom = models.ForeignKey("academics.Class", on_delete=models.PROTECT, related_name='class_report')
    # title/body remain optional for reports created before the structured format.
    title = models.CharField(max_length=50, blank=True, default="")
    reporting_period = models.CharField(max_length=50, blank=True, default="")
    body = models.TextField(max_length=1000, blank=True, default="")
    topic_taught = models.TextField(max_length=500, blank=True, default="")
    learning_goals = models.TextField(max_length=1000, blank=True, default="")
    key_concepts = models.TextField(max_length=1500, blank=True, default="")
    activities = models.TextField(max_length=1000, blank=True, default="")
    practical_works = models.TextField(max_length=1000, blank=True, default="")
    assignment = models.TextField(max_length=1000, blank=True, default="")
    assignment_due_date = models.DateField(blank=True, null=True)
    next_lesson = models.TextField(max_length=1000, blank=True, default="")
    materials = models.TextField(max_length=1000, blank=True, default="")
    status = models.CharField(choices=Status.choices, max_length=20, default=Status.DRAFT)
    written_on = models.DateTimeField(auto_now_add=True)
    published_on = models.DateTimeField(blank=True, null=True)
    #Don't forget to implement in views...
    

    def __str__(self):
        return f"{self.title or self.topic_taught or 'Class learning report'} - {self.classroom}({self.classroom.program})"

class StudentFeedback(models.Model):
    class EmailStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"
        SKIPPED = "skipped", "Skipped"

    author = models.ForeignKey("accounts.InstructorProfile", on_delete=models.PROTECT, related_name="student_feedback")
    enrollment = models.ForeignKey("academics.StudentEnrollment", on_delete=models.PROTECT, related_name="student_feedback")
    report = models.ForeignKey(ClassReport, on_delete=models.CASCADE, related_name="student_feedback", blank=True, null=True)
    # Legacy free-text feedback is retained for old records.
    feedback = models.TextField(max_length=500, blank=True, default="")
    answers = models.JSONField(default=dict, blank=True)
    note = models.TextField(max_length=500, blank=True, default="")
    personalized_report = models.TextField(blank=True, default="")
    email_status = models.CharField(max_length=12, choices=EmailStatus.choices, default=EmailStatus.PENDING)
    email_attempts = models.PositiveSmallIntegerField(default=0)
    email_sent_on = models.DateTimeField(blank=True, null=True)
    email_error = models.TextField(blank=True, default="")
    written_on = models.DateTimeField(auto_now_add=True)


    def __str__(self):
        return f"Private Feedback for {self.enrollment.student}"

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["report", "enrollment"], name="one_feedback_per_report_enrollment"),
        ]

from django.db import models

# Create your models here.

class ClassReport(models.Model):
    class Status(models.TextChoices):
        DRAFT= "draft", "Draft"
        PUBLISHED = "published", "Published"

    author = models.ForeignKey("accounts.InstructorProfile", on_delete=models.PROTECT, related_name="class_report")
    classroom = models.ForeignKey("academics.Class", on_delete=models.PROTECT, related_name='class_report')
    title = models.CharField(max_length=50)
    body = models.TextField(max_length=1000)
    status = models.CharField(choices=Status.choices, max_length=20, default=Status.DRAFT)
    written_on = models.DateTimeField(auto_now_add=True)
    published_on = models.DateTimeField(blank=True, null=True)
    #Don't forget to implement in views...
    

    def __str__(self):
        return f"{self.title} - {self.classroom}({self.classroom.program})"

class StudentFeedback(models.Model):
    author = models.ForeignKey("accounts.InstructorProfile", on_delete=models.PROTECT, related_name="student_feedback")
    enrollment = models.ForeignKey("academics.StudentEnrollment", on_delete=models.PROTECT, related_name="student_feedback")
    feedback = models.TextField(max_length=500)
    written_on = models.DateTimeField(auto_now_add=True)


    def __str__(self):
        return f"Private Feedback for {self.enrollment.student}"
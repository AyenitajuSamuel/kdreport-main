from django.db import models
from django.core.exceptions import ValidationError

# Create your models here.
class Program(models.Model):
    class Status(models.TextChoices):
        UPCOMING=  "upcoming", "Upcoming"
        ACTIVE = "active",  "Active"
        COMPLETED = "completed",  "Completed"
        ARCHIVED = "archived",  "Archived"

    name = models.CharField(unique=True, max_length=50)
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length= 20, choices=Status.choices, default=Status.UPCOMING)

    def __str__(self):
        return self.name

class Class(models.Model):
    name = models.CharField(max_length=20)
    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name="classes")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} - ({self.program.name})"
    
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["program", "name"],
                name="unique_class_per_program"
            )
        ]


class StudentEnrollment(models.Model):
    student = models.ForeignKey("accounts.StudentProfile", on_delete=models.PROTECT, related_name="enrollments")
    classroom = models.ForeignKey(Class, on_delete=models.PROTECT, related_name="enrollments")
    program = models.ForeignKey(Program, on_delete=models.PROTECT, related_name="enrollments")
    enrolled_on = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'program'],
                name="one_enrollment_per_student_program"
            ),
            ]

    def clean(self):
        if (self.program_id and self.classroom_id and self.classroom.program_id != self.program_id):
                raise ValidationError(
                    {"classroom": "This class does not belong to a selected program."}
                )

    def __str__(self):
        return f"{self.student} - {self.program} - {self.classroom}"


class InstructorAssignment(models.Model):

    instructor = models.ForeignKey("accounts.InstructorProfile", on_delete=models.PROTECT, related_name="instructor_assignment")
    classroom = models.ForeignKey(Class, on_delete=models.PROTECT, related_name="instructor_assignment")
    program = models.ForeignKey(Program, on_delete=models.PROTECT, related_name="instructor_assignment")
    assigned_on = models.DateTimeField(auto_now_add=True)
    subject = models.CharField(max_length=20)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["instructor", "classroom", "subject"],
                name = "one_instructor_per_classroom_subject"
            )
        ]
    
    def clean(self):
        if (self.program_id and self.classroom_id and self.classroom.program_id != self.program_id):
                raise ValidationError(
                    {"classroom": "This class does not belong to a selected program."}
                )

    def __str__(self):
        return f"{self.instructor} - {self.program} - {self.classroom} - {self.subject}"
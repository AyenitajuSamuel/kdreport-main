from rest_framework import serializers

from .models import ClassReport, StudentFeedback


class ClassReportSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.user.get_full_name", read_only=True)
    class_name = serializers.CharField(source="classroom.name", read_only=True)

    class Meta:
        model = ClassReport
        fields = ["id", "author", "author_name", "classroom", "class_name", "title", "body", "status", "written_on", "published_on"]
        read_only_fields = ["id", "author", "status", "written_on", "published_on"]


class StudentFeedbackSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.user.get_full_name", read_only=True)
    student_name = serializers.CharField(source="enrollment.student.user.get_full_name", read_only=True)

    class Meta:
        model = StudentFeedback
        fields = ["id", "author", "author_name", "enrollment", "student_name", "feedback", "written_on"]
        read_only_fields = ["id", "author", "written_on"]

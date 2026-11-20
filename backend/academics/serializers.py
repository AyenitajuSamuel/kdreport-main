from rest_framework import serializers

from . import models


class ProgramSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Program
        fields = ["id", "name", "start_date", "end_date", "status"]
        read_only_fields = ["id"]


class ClassSerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source="program.name", read_only=True)

    class Meta:
        model = models.Class
        fields = ["id", "name", "program", "program_name", "created_at", "updated_at"]
        read_only_fields = ["id", "program", "created_at", "updated_at"]


class StudentEnrollmentSerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source="program.name", read_only=True)
    class_name = serializers.CharField(source="classroom.name", read_only=True)
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)

    class Meta:
        model = models.StudentEnrollment
        fields = ["id", "student", "student_name", "classroom", "class_name", "program", "program_name", "enrolled_on"]
        read_only_fields = ["id", "program", "enrolled_on"]

    def validate_classroom(self, classroom):
        program_pk = self.context["view"].kwargs.get("program_pk")
        if program_pk and classroom.program_id != int(program_pk):
            raise serializers.ValidationError("This class does not belong to the program in the URL.")
        return classroom

class InstructorAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.InstructorAssignment
        fields = ["id", "instructor", "classroom", "program", "assigned_on", "subject"]
        read_only_fields = ["id", "program", "assigned_on"]

    def validate_classroom(self, classroom):
        program_pk = self.context["view"].kwargs.get("program_pk")
        if program_pk and classroom.program_id != int(program_pk):
            raise serializers.ValidationError("This class does not belong to the program in the URL.")
        return classroom

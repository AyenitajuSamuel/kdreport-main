from rest_framework import serializers

from . import models


class ProgramSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Program
        fields = ["id", "name", "start_date", "end_date", "status"]
        read_only_fields = ["id"]


class ClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Class
        fields = ["id", "name", "program", "created_at", "updated_at"]
        read_only_fields = ["id", "program", "created_at", "updated_at"]


class StudentEnrollmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.StudentEnrollment
        fields = ["id", "student", "classroom", "program", "enrolled_on"]
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

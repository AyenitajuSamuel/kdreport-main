from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied

from accounts.models import StudentProfile
from accounts.serializers import ClassRosterStudentSerializer
from . import models, serializers


class IsAdminOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.is_superuser or user.role == user.Role.ADMIN))


class IsInstructorOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.is_superuser or user.role in (user.Role.ADMIN, user.Role.INSTRUCTOR)))


class ProgramListCreateView(generics.ListCreateAPIView):
    queryset = models.Program.objects.all().order_by("name")
    serializer_class = serializers.ProgramSerializer
    permission_classes = [IsAdminOnly]


class ProgramDetailView(generics.RetrieveUpdateAPIView):
    queryset = models.Program.objects.all()
    serializer_class = serializers.ProgramSerializer
    permission_classes = [IsAdminOnly]


class ClassListCreateView(generics.ListCreateAPIView):
    serializer_class = serializers.ClassSerializer
    permission_classes = [IsAdminOnly]

    def get_queryset(self):
        program = get_object_or_404(models.Program, pk=self.kwargs["program_pk"])
        return program.classes.order_by("name")

    def perform_create(self, serializer):
        program = get_object_or_404(models.Program, pk=self.kwargs["program_pk"])
        serializer.save(program=program)


class ClassDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = serializers.ClassSerializer
    permission_classes = [IsAdminOnly]

    def get_queryset(self):
        return models.Class.objects.filter(program_id=self.kwargs["program_pk"])


class StudentEnrollmentListCreateView(generics.ListCreateAPIView):
    serializer_class = serializers.StudentEnrollmentSerializer
    permission_classes = [IsAdminOnly]

    def get_queryset(self):
        return models.StudentEnrollment.objects.filter(program_id=self.kwargs["program_pk"]).select_related(
            "student__user", "classroom", "program"
        ).order_by("enrolled_on")

    def perform_create(self, serializer):
        program = get_object_or_404(models.Program, pk=self.kwargs["program_pk"])
        serializer.save(program=program)


class StudentEnrollmentDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = serializers.StudentEnrollmentSerializer
    permission_classes = [IsAdminOnly]

    def get_queryset(self):
        return models.StudentEnrollment.objects.filter(program_id=self.kwargs["program_pk"])


class InstructorAssignmentListCreateView(generics.ListCreateAPIView):
    serializer_class = serializers.InstructorAssignmentSerializer
    permission_classes = [IsAdminOnly]

    def get_queryset(self):
        return models.InstructorAssignment.objects.filter(program_id=self.kwargs["program_pk"]).select_related(
            "instructor__user", "classroom", "program"
        )

    def perform_create(self, serializer):
        program = get_object_or_404(models.Program, pk=self.kwargs["program_pk"])
        serializer.save(program=program)


class InstructorAssignmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = serializers.InstructorAssignmentSerializer
    permission_classes = [IsAdminOnly]

    def get_queryset(self):
        return models.InstructorAssignment.objects.filter(program_id=self.kwargs["program_pk"])


class InstructorMyClassesView(generics.ListAPIView):
    serializer_class = serializers.ClassSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.role == user.Role.ADMIN or user.is_superuser:
            return models.Class.objects.all().select_related("program").order_by("program__name", "name")
        return models.Class.objects.filter(instructor_assignment__instructor__user=user).select_related(
            "program"
        ).distinct().order_by("program__name", "name")


class ClassRosterView(generics.ListAPIView):
    serializer_class = ClassRosterStudentSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        classroom = get_object_or_404(models.Class, pk=self.kwargs["class_pk"])
        user = self.request.user
        is_admin = user.is_superuser or user.role == user.Role.ADMIN
        if not is_admin and not models.InstructorAssignment.objects.filter(
            instructor__user=user, classroom=classroom
        ).exists():
            raise PermissionDenied("You are not assigned to this class.")
        return StudentProfile.objects.filter(enrollments__classroom=classroom).select_related("user").distinct().order_by(
            "user__last_name", "user__first_name"
        )


class ClassEnrollmentListView(generics.ListAPIView):
    serializer_class = serializers.StudentEnrollmentSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        classroom = get_object_or_404(models.Class, pk=self.kwargs["class_pk"])
        user = self.request.user
        is_admin = user.is_superuser or user.role == user.Role.ADMIN
        if not is_admin and not models.InstructorAssignment.objects.filter(
            instructor__user=user, classroom=classroom
        ).exists():
            raise PermissionDenied("You are not assigned to this class.")
        return models.StudentEnrollment.objects.filter(classroom=classroom).select_related(
            "student__user", "classroom", "program"
        ).order_by("student__user__last_name", "student__user__first_name")

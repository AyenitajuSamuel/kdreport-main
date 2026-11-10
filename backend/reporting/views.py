from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from academics.models import Class, InstructorAssignment, StudentEnrollment
from accounts.models import InstructorProfile
from .email_utils import send_class_report_to_parents
from .models import ClassReport, StudentFeedback
from .serializers import ClassReportSerializer, StudentFeedbackSerializer


class IsInstructorOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.is_superuser or user.role in (user.Role.ADMIN, user.Role.INSTRUCTOR)))


def is_admin(user):
    return user.is_superuser or user.role == user.Role.ADMIN


def ensure_assigned(user, classroom):
    if not is_admin(user) and not InstructorAssignment.objects.filter(
        instructor__user=user, classroom=classroom
    ).exists():
        raise PermissionDenied("You are not assigned to this class.")


class ClassReportListCreateView(generics.ListCreateAPIView):
    serializer_class = ClassReportSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        classroom = get_object_or_404(Class, pk=self.kwargs["class_pk"])
        ensure_assigned(self.request.user, classroom)
        queryset = ClassReport.objects.filter(classroom=classroom).select_related("author__user", "classroom")
        if not is_admin(self.request.user):
            queryset = queryset.filter(author__user=self.request.user)
        status_filter = self.request.query_params.get("status")
        if status_filter:
            if status_filter not in ClassReport.Status.values:
                raise ValidationError({"status": "Choose draft or published."})
            queryset = queryset.filter(status=status_filter)
        date_filter = self.request.query_params.get("date")
        if date_filter:
            parsed_date = parse_date(date_filter)
            if parsed_date is None:
                raise ValidationError({"date": "Use YYYY-MM-DD format."})
            queryset = queryset.filter(written_on__date=parsed_date)
        return queryset.order_by("-written_on")

    def perform_create(self, serializer):
        classroom = get_object_or_404(Class, pk=self.kwargs["class_pk"])
        ensure_assigned(self.request.user, classroom)
        if is_admin(self.request.user):
            raise PermissionDenied("An instructor must author the class report.")
        instructor = get_object_or_404(InstructorProfile, user=self.request.user)
        serializer.save(classroom=classroom, author=instructor)


class ClassReportDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = ClassReportSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        queryset = ClassReport.objects.select_related("author__user", "classroom")
        if not is_admin(self.request.user):
            queryset = queryset.filter(
                author__user=self.request.user,
                classroom__instructor_assignment__instructor__user=self.request.user,
            )
        return queryset

    def perform_update(self, serializer):
        report = self.get_object()
        ensure_assigned(self.request.user, report.classroom)
        if report.status == ClassReport.Status.PUBLISHED and not is_admin(self.request.user):
            raise PermissionDenied("Published reports cannot be edited by instructors.")
        serializer.save()


class ClassReportPublishView(APIView):
    permission_classes = [IsInstructorOrAdmin]

    def post(self, request, report_pk):
        queryset = ClassReport.objects.select_related("author__user", "classroom")
        if not is_admin(request.user):
            queryset = queryset.filter(
                author__user=request.user,
                classroom__instructor_assignment__instructor__user=request.user,
            )
        report = get_object_or_404(queryset, pk=report_pk)
        ensure_assigned(request.user, report.classroom)
        if report.status == ClassReport.Status.PUBLISHED:
            return Response(ClassReportSerializer(report).data)
        report.status = ClassReport.Status.PUBLISHED
        report.published_on = timezone.now()
        report.save(update_fields=["status", "published_on"])
        send_class_report_to_parents(report)
        return Response(ClassReportSerializer(report).data, status=status.HTTP_200_OK)


class EnrollmentFeedbackListCreateView(generics.ListCreateAPIView):
    serializer_class = StudentFeedbackSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        enrollment = get_object_or_404(
            StudentEnrollment.objects.select_related("classroom", "student__user"),
            pk=self.kwargs["enrollment_pk"],
        )
        ensure_assigned(self.request.user, enrollment.classroom)
        queryset = StudentFeedback.objects.filter(enrollment=enrollment).select_related("author__user", "enrollment__student__user")
        if not is_admin(self.request.user):
            queryset = queryset.filter(author__user=self.request.user)
        return queryset.order_by("-written_on")

    def perform_create(self, serializer):
        enrollment = get_object_or_404(
            StudentEnrollment.objects.select_related("classroom"), pk=self.kwargs["enrollment_pk"]
        )
        ensure_assigned(self.request.user, enrollment.classroom)
        if is_admin(self.request.user):
            raise PermissionDenied("An assigned instructor must author student feedback.")
        instructor = get_object_or_404(InstructorProfile, user=self.request.user)
        serializer.save(enrollment=enrollment, author=instructor)


class StudentFeedbackDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = StudentFeedbackSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        queryset = StudentFeedback.objects.select_related("author__user", "enrollment__classroom", "enrollment__student__user")
        if not is_admin(self.request.user):
            queryset = queryset.filter(
                author__user=self.request.user,
                enrollment__classroom__instructor_assignment__instructor__user=self.request.user,
            )
        return queryset

    def perform_update(self, serializer):
        feedback = self.get_object()
        ensure_assigned(self.request.user, feedback.enrollment.classroom)
        serializer.save()

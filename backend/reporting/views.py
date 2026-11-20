from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from academics.models import Class, InstructorAssignment, StudentEnrollment
from accounts.models import InstructorProfile
from .email_utils import build_parent_report_pdf, send_class_report_to_parents
from .gemini import GeminiGenerationError, generate_personalized_report
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


def generate_report_previews(report):
    enrolled_ids = set(StudentEnrollment.objects.filter(classroom=report.classroom).values_list("id", flat=True))
    completed_ids = set(report.student_feedback.values_list("enrollment_id", flat=True))
    if enrolled_ids != completed_ids:
        raise ValidationError({"student_feedback": "Complete private feedback for every enrolled student before generating previews."})
    previews = []
    for feedback in report.student_feedback.select_related("enrollment__student__user").all():
        student = feedback.enrollment.student.user
        student_name = student.get_full_name().strip() or student.username or "Student"
        if not feedback.personalized_report or student_name.casefold() not in feedback.personalized_report.casefold():
            try:
                feedback.personalized_report = generate_personalized_report(report, feedback)
            except GeminiGenerationError as error:
                return None, str(error)
            feedback.save(update_fields=["personalized_report"])
        previews.append({
            "enrollment_id": feedback.enrollment_id,
            "student_name": student_name,
            "personalized_report": feedback.personalized_report,
        })
    return previews, None


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
        if report.status == ClassReport.Status.PUBLISHED:
            raise PermissionDenied("Published reports cannot be edited. Create a new draft to send a correction.")
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
            delivery = send_class_report_to_parents(report)
            payload = ClassReportSerializer(report).data
            payload["delivery_attempt"] = delivery
            return Response(payload)
        _, generation_error = generate_report_previews(report)
        if generation_error:
            return Response({"detail": generation_error}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        report.status = ClassReport.Status.PUBLISHED
        report.published_on = timezone.now()
        report.save(update_fields=["status", "published_on"])
        delivery = send_class_report_to_parents(report)
        payload = ClassReportSerializer(report).data
        payload["delivery_attempt"] = delivery
        return Response(payload, status=status.HTTP_200_OK)


class ClassReportPreviewView(APIView):
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
        if report.status != ClassReport.Status.DRAFT:
            raise ValidationError({"detail": "Only draft reports can generate a preview."})
        previews, generation_error = generate_report_previews(report)
        if generation_error:
            return Response({"detail": generation_error}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response({"report_id": report.pk, "students": previews})


class ClassReportPdfPreviewView(APIView):
    permission_classes = [IsInstructorOrAdmin]

    def get(self, request, report_pk, enrollment_pk):
        queryset = ClassReport.objects.select_related("author__user", "classroom__program")
        if not is_admin(request.user):
            queryset = queryset.filter(
                author__user=request.user,
                classroom__instructor_assignment__instructor__user=request.user,
            )
        report = get_object_or_404(queryset, pk=report_pk)
        ensure_assigned(request.user, report.classroom)
        feedback = get_object_or_404(
            report.student_feedback.select_related("enrollment__student__user"),
            enrollment_id=enrollment_pk,
        )
        if not feedback.personalized_report:
            raise ValidationError({"detail": "Generate the report preview before opening its PDF."})
        pdf_content, filename = build_parent_report_pdf(report, feedback)
        response = HttpResponse(pdf_content, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response


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

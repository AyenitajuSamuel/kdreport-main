import json
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_GET
from django.views.decorators.http import require_POST
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password
from rest_framework.response import Response
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from . import serializers
from rest_framework import generics, permissions
from django.shortcuts import get_object_or_404
from . import models


# Create your views here.
@ensure_csrf_cookie
@require_GET
def csrf_token(request):
    return JsonResponse({"detail": "CSRF token is set."})

@csrf_protect
@require_POST
def login(request):
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"detail": "Request body must be valid JSON"}, status=400)

    if not isinstance(data, dict):
        return JsonResponse({'detail': "Request body must be a JSON object."}, status=400)

    username = data.get("username")
    password = data.get("password")

    if not isinstance(username, str) or not username.strip() or not isinstance(password, str) or not password:
        return JsonResponse({"detail": "Both username and password are required."}, status=400)

    user = authenticate(request, username=username.strip(), password=password)

    if user is None:
        return JsonResponse({"detail": "Invalid username or password."}, status=401)
    
    auth_login(request, user)

    return JsonResponse(
        {
        "user": {
            "id": user.pk,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
        },
    }
    )

@require_GET
def me(request):
    if not request.user.is_authenticated:
        return JsonResponse(
            {"detail": "Authentication required."},
            status=401,
        )

    user = request.user

    return JsonResponse({
        "user": {
            "id": user.pk,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
        }
    })

@csrf_protect
@require_POST
def logout(request):
    if not request.user.is_authenticated:
        return JsonResponse(
            {"detail": "You are not signed in."},
            status=401,
        )
    
    auth_logout(request)
    return JsonResponse({"detail": "You have been logged out."})

@csrf_protect
@require_POST
def password_reset_request(request):
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"detail": "Request body must be valid JSON."}, status=400)

    if not isinstance(data, dict):
        return JsonResponse({"detail": "Request body must be a JSON object."}, status=400)

    username = data.get("username")
    if not isinstance(username, str) or not username.strip():
        return JsonResponse({"detail": "Username is required."}, status=400)

    User = get_user_model()
    user = User.objects.filter(
        username=username.strip(),
        is_active=True,
    ).first()

    if user:
        recipient = ""

        if user.role == User.Role.STUDENT:
            profile = getattr(user, "student_profile", None)
            if profile:
                recipient = profile.parent_email
        elif user.role in (User.Role.ADMIN, User.Role.INSTRUCTOR):
            recipient = user.email

        if recipient:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_url = (
                f"{settings.FRONTEND_BASE_URL}/reset-password"
                f"?uid={uid}&token={token}"
            )

            send_mail(
                subject="Set or reset your Kiddies Droid password",
                message=(
                    f"Username: {user.username}\n\n"
                    f"Use this one-time link to set a new password:\n{reset_url}"
                ),
                from_email=None,
                recipient_list=[recipient],
            )

    return JsonResponse({
        "detail": "If an account matches that username, password instructions have been sent."
    })


@csrf_protect
@require_POST
def password_reset_confirm(request):
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse(
            {"detail": "Request body must be valid JSON."},
            status=400,
        )

    if not isinstance(data, dict):
        return JsonResponse(
            {"detail": "Request body must be a JSON object."},
            status=400,
        )

    uid = data.get("uid")
    token = data.get("token")
    password = data.get("password")

    if not all(isinstance(value, str) and value for value in (uid, token, password)):
        return JsonResponse(
            {"detail": "uid, token, and password are required."},
            status=400,
        )

    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        User = get_user_model()
        user = User.objects.get(pk=user_id, is_active=True)
    except (ValueError, TypeError, OverflowError, get_user_model().DoesNotExist):
        return JsonResponse(
            {"detail": "This password link is invalid or has expired."},
            status=400,
        )

    if not default_token_generator.check_token(user, token):
        return JsonResponse(
            {"detail": "This password link is invalid or has expired."},
            status=400,
        )

    try:
        validate_password(password, user)
    except ValidationError as error:
        return JsonResponse(
            {
                "detail": "Choose a password that meets the password requirements.",
                "errors": error.messages,
            },
            status=400,
        )

    user.set_password(password)
    user.save(update_fields=["password"])

    return JsonResponse({"detail": "Your password has been set. You can now log in."})


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)

        user = request. user
        return bool(user and user.is_authenticated and (user.is_superuser or user.role == user.Role.ADMIN)
        )

class IsAdminOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.is_superuser or user.role == user.Role.ADMIN)
        )

class StudentProfileListCreateView(generics.ListCreateAPIView):
    queryset = models.StudentProfile.objects.all().order_by('user__first_name')
    serializer_class = serializers.StudentProfileSerializer
    permission_classes = [IsAdminOnly]

    def perform_create(self, serializer):
        profile = serializer.save()
        send_mail(
            subject="Your Kiddies Droid student account",
            message=(
                f"A student account has been created for {profile.user.get_full_name()}.\n\n"
                f"Username: {profile.user.username}\n"
                f"Temporary password: {profile._temporary_password}\n\n"
                "Please sign in and change the password."
            ),
            from_email=None,
            recipient_list=[profile.parent_email],
        )


class StudentProfileDetailView(generics.RetrieveUpdateAPIView):
    queryset = models.StudentProfile.objects.select_related("user")
    serializer_class = serializers.StudentProfileSerializer
    permission_classes = [IsAdminOnly]


class InstructorProfileListCreateView(generics.ListCreateAPIView):
    queryset = models.InstructorProfile.objects.select_related("user").order_by("user__last_name", "user__first_name")
    serializer_class = serializers.InstructorProfileSerializer
    permission_classes = [IsAdminOnly]

    def perform_create(self, serializer):
        profile = serializer.save()
        send_mail(
            subject="Your Kiddies Droid instructor account",
            message=(
                f"Username: {profile.user.username}\n"
                f"Temporary password: {profile._temporary_password}\n\n"
                "Please sign in and change the password."
            ),
            from_email=None,
            recipient_list=[profile.user.email],
        )


class InstructorProfileDetailView(generics.RetrieveUpdateAPIView):
    queryset = models.InstructorProfile.objects.select_related("user")
    serializer_class = serializers.InstructorProfileSerializer
    permission_classes = [IsAdminOnly]


class StudentMeView(generics.RetrieveUpdateAPIView):
    serializer_class = serializers.StudentSelfProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        if self.request.user.role != self.request.user.Role.STUDENT:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("This endpoint is for student accounts.")
        return get_object_or_404(models.StudentProfile, user=self.request.user)


class StudentMyEnrollmentsView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role != self.request.user.Role.STUDENT:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("This endpoint is for student accounts.")
        from academics.models import StudentEnrollment
        return StudentEnrollment.objects.filter(student__user=self.request.user).select_related("program", "classroom")

    def list(self, request, *args, **kwargs):
        from academics.serializers import StudentEnrollmentSerializer
        return Response(StudentEnrollmentSerializer(self.get_queryset(), many=True).data)


class StudentMyReportsView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, *args, **kwargs):
        if request.user.role != request.user.Role.STUDENT:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("This endpoint is for student accounts.")
        from reporting.models import ClassReport, StudentFeedback
        reports = ClassReport.objects.filter(
            classroom__enrollments__student__user=request.user,
            status=ClassReport.Status.PUBLISHED,
        ).select_related("classroom", "author__user").distinct().order_by("-published_on")
        personalized_reports = {
            feedback.report_id: feedback.personalized_report
            for feedback in StudentFeedback.objects.filter(
                report__in=reports,
                enrollment__student__user=request.user,
            )
        }
        return Response([
            {
                "id": report.pk,
                "classroom": report.classroom_id,
                "class_name": report.classroom.name,
                "author_name": report.author.user.get_full_name(),
                "title": report.title,
                "display_title": report.title or "KiddiesDroid Report",
                "personalized_report": personalized_reports.get(report.pk, ""),
                "published_on": report.published_on,
            }
            for report in reports
        ])


class StudentMyFeedbackView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, *args, **kwargs):
        if request.user.role != request.user.Role.STUDENT:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("This endpoint is for student accounts.")
        from reporting.models import StudentFeedback
        from reporting.serializers import StudentFeedbackSerializer
        feedback = StudentFeedback.objects.filter(
            enrollment__student__user=request.user,
        ).select_related("enrollment", "author__user")
        return Response(StudentFeedbackSerializer(feedback, many=True).data)

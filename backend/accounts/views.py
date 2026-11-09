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
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode


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


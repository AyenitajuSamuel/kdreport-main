import json
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_GET
from django.views.decorators.http import require_POST
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout

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


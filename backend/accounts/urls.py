from django.urls import path
from . import views

urlpatterns = [
    path("csrf/", views.csrf_token, name="csrf-token"),
    path("login/", views.login, name="login"),
    path("me/", views.me, name="me"),
    path("logout/", views.logout, name="logout"),
    path("password_reset_request/", views.password_reset_request, name="password_reset_request"),
    path("password_reset_confirm/", views.password_reset_confirm, name="password_reset_confirm"),
]
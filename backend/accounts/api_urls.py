from django.urls import path

from . import views

urlpatterns = [
    path("student/", views.StudentProfileListCreateView.as_view(), name="students"),
    path("student/<int:pk>/", views.StudentProfileDetailView.as_view(), name="student-detail"),
    path("student/me/", views.StudentMeView.as_view(), name="student-me"),
    path("student/me/enrollments/", views.StudentMyEnrollmentsView.as_view(), name="student-my-enrollments"),
    path("student/me/reports/", views.StudentMyReportsView.as_view(), name="student-my-reports"),
    path("student/me/feedback/", views.StudentMyFeedbackView.as_view(), name="student-my-feedback"),
    path("instructors/", views.InstructorProfileListCreateView.as_view(), name="instructors"),
    path("instructors/<int:pk>/", views.InstructorProfileDetailView.as_view(), name="instructor-detail"),
]

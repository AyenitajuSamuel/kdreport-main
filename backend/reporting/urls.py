from django.urls import path

from . import views

urlpatterns = [
    path("classes/<int:class_pk>/reports/", views.ClassReportListCreateView.as_view(), name="class-reports"),
    path("class-reports/<int:pk>/", views.ClassReportDetailView.as_view(), name="class-report-detail"),
    path("class-reports/<int:report_pk>/publish/", views.ClassReportPublishView.as_view(), name="class-report-publish"),
    path("enrollments/<int:enrollment_pk>/feedback/", views.EnrollmentFeedbackListCreateView.as_view(), name="enrollment-feedback"),
    path("student-feedback/<int:pk>/", views.StudentFeedbackDetailView.as_view(), name="student-feedback-detail"),
]

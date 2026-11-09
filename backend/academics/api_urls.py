from django.urls import path

from . import views

urlpatterns = [
    path("my/classes/", views.InstructorMyClassesView.as_view(), name="instructor-my-classes-api"),
    path("classes/<int:class_pk>/students/", views.ClassRosterView.as_view(), name="class-roster-api"),
]

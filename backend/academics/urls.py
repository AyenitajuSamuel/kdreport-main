from django.urls import path
from . import views

urlpatterns = [
    path('program/', views.ProgramListCreateView.as_view(), name='ProgramListCreateView'),
    path('program/<int:pk>/', views.ProgramDetailView.as_view(), name='ProgramDetailView'),
    path('program/<int:program_pk>/classes/', views.ClassListCreateView.as_view(), name='ClassListCreateView'),
    path('program/<int:program_pk>/class/<int:pk>/', views.ClassDetailView.as_view(), name='ClassDetailView'),
    path('program/<int:program_pk>/enrollment/', views.StudentEnrollmentListCreateView.as_view(), name='StudentEnrollmentListCreateView'),
    path('program/<int:program_pk>/enrollment/<int:pk>/', views.StudentEnrollmentDetailView.as_view(), name="StudentEnrollmentDetailView"),
    path('program/<int:program_pk>/instructor_assignment/', views.InstructorAssignmentListCreateView.as_view(), name="InstructorAssignmentListCreateView"),
    path('program/<int:program_pk>/instructor_assignment/<int:pk>/', views.InstructorAssignmentDetailView.as_view(), name="InstructorAssignmentDetailView"),
    path('my/classes/', views.InstructorMyClassesView.as_view(), name="academics-instructor-my-classes"),
    path('classes/<int:class_pk>/students/', views.ClassRosterView.as_view(), name="academics-class-roster"),
]

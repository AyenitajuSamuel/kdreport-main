"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.contrib import admin
from django.http import FileResponse, Http404
from django.urls import path, include, re_path


def frontend(request, path=""):
    index_path = settings.BASE_DIR.parent / "frontend" / "dist" / "index.html"
    if not index_path.is_file():
        raise Http404("Frontend build is missing.")
    return FileResponse(index_path.open("rb"), content_type="text/html")


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include("accounts.urls")),
    path('api/v1/', include("accounts.api_urls")),
    path('api/v1/', include("academics.api_urls")),
    path('api/v1/academics/', include("academics.urls")),
    path('api/v1/', include("reporting.urls")),
    re_path(r"^(?!api/|admin/|static/).*$", frontend),
]

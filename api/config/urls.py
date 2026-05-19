from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),

    # API MODULES
    path("api/core/", include("core.urls")),
    path("api/", include("users.urls")),
]
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),

    # API MODULES
    path("api/", include("core.urls")),
    path("api/", include("users.urls")),
    path("api/", include("apps.communities.urls")),
    path("api/", include("apps.events.urls")),
    path("api/", include("apps.feed.urls")),
]

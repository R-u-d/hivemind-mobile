from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import NotificationViewSet, PushTokenView

router = DefaultRouter()
router.register("notifications", NotificationViewSet, basename="notification")

urlpatterns = [
    path("push-tokens/", PushTokenView.as_view(), name="push-token"),
    path("", include(router.urls)),
]

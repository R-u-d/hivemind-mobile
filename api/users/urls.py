from django.urls import path

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .throttles import AuthRateThrottle
from .views import LogoutView, MeView, PublicProfileView, RegisterView


class ThrottledTokenObtainPairView(TokenObtainPairView):
    throttle_classes = [AuthRateThrottle]


class ThrottledTokenRefreshView(TokenRefreshView):
    throttle_classes = [AuthRateThrottle]


urlpatterns = [
    # AUTH
    path("auth/register/", RegisterView.as_view()),
    path("auth/login/", ThrottledTokenObtainPairView.as_view()),
    path("auth/token/refresh/", ThrottledTokenRefreshView.as_view()),
    path("auth/logout/", LogoutView.as_view()),

    # USERS
    path("users/me/", MeView.as_view()),
    path("users/<uuid:pk>/", PublicProfileView.as_view()),
]

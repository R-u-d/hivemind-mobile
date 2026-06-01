from django.urls import path

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .throttles import AuthRateThrottle
from .views import (
    AvatarUploadUrlView,
    ForgotPasswordView,
    LogoutView,
    MeCommunitiesView,
    MeView,
    PublicProfileView,
    RegisterView,
    ResetPasswordView,
    VerifyResetCodeView,
)


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
    path("auth/forgot-password/", ForgotPasswordView.as_view()),
    path("auth/verify-reset-code/", VerifyResetCodeView.as_view()),
    path("auth/reset-password/", ResetPasswordView.as_view()),

    # USERS
    path("users/me/", MeView.as_view()),
    path("users/me/communities/", MeCommunitiesView.as_view()),
    path("users/me/avatar-upload-url/", AvatarUploadUrlView.as_view(), name="avatar-upload-url"),
    path("users/<uuid:pk>/", PublicProfileView.as_view()),
]

from django.urls import path

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from .views import (
    RegisterView,
    MeView,
    PublicProfileView,
    LogoutView,
)

urlpatterns = [
    # AUTH
    path("auth/register/", RegisterView.as_view()),
    path("auth/login/", TokenObtainPairView.as_view()),
    path("auth/token/refresh/", TokenRefreshView.as_view()),
    path("auth/logout/", LogoutView.as_view()),

    # USERS
    path("users/me/", MeView.as_view()),
    path("users/<uuid:pk>/", PublicProfileView.as_view()),
]

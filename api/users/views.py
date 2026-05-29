from datetime import datetime, timezone as dt_timezone

from django.conf import settings as django_settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail

from rest_framework import generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken

from django.db.models import BooleanField, Count, Value

from apps.communities.models import Community, Membership
from apps.communities.serializers import CommunityMinimalSerializer
from core.s3 import S3Error, generate_avatar_presigned_url
from .models import PasswordResetToken
from .serializers import (
    AvatarUploadSerializer,
    ForgotPasswordSerializer,
    PublicUserSerializer,
    RegisterSerializer,
    ResetPasswordSerializer,
    UserSerializer,
    VerifyResetCodeSerializer,
)
from .throttles import AuthRateThrottle

User = get_user_model()


# -------------------------
# REGISTER
# -------------------------
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthRateThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )

# -------------------------
# ME (GET + PATCH)
# -------------------------
class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


# -------------------------
# PUBLIC PROFILE
# -------------------------
class PublicProfileView(generics.RetrieveAPIView):
    serializer_class = PublicUserSerializer
    permission_classes = [permissions.AllowAny]
    queryset = User.objects.all()


# -------------------------
# LOGOUT
# -------------------------
class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")

        if not refresh_token:
            return Response(
                {"refresh": "This field is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            RefreshToken(refresh_token).blacklist()
            self._blacklist_access_token(request)

            return Response(status=status.HTTP_204_NO_CONTENT)

        except TokenError:
            return Response(
                {"detail": "Invalid or expired token"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def _blacklist_access_token(self, request):
        access = AccessToken(str(request.auth))
        outstanding, _ = OutstandingToken.objects.get_or_create(
            jti=access["jti"],
            defaults={
                "user": request.user,
                "token": str(request.auth),
                "expires_at": datetime.fromtimestamp(access["exp"], tz=dt_timezone.utc),
            },
        )
        BlacklistedToken.objects.get_or_create(token=outstanding)


# -------------------------
# MY COMMUNITIES
# -------------------------
class MeCommunitiesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        my_community_ids = (
            Membership.objects
            .filter(user=request.user)
            .values_list("community_id", flat=True)
        )
        qs = (
            Community.objects
            .filter(id__in=my_community_ids)
            .annotate(
                member_count=Count("memberships"),
                is_member=Value(True, output_field=BooleanField()),
            )
        )
        serializer = CommunityMinimalSerializer(qs, many=True)
        return Response(serializer.data)


# -------------------------
# FORGOT PASSWORD
# -------------------------
class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"email": ["An account with this email doesn't exist."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reset_token = PasswordResetToken.create_for_user(user)

        send_mail(
            subject="Reset your HiveMind password",
            message=(
                f"Hi {user.display_name},\n\n"
                f"Use the code below to reset your password. It expires in 1 hour.\n\n"
                f"  {reset_token.token}\n\n"
                f"If you didn't request this, you can safely ignore this email."
            ),
            from_email=getattr(django_settings, "DEFAULT_FROM_EMAIL", "noreply@hivemind.app"),
            recipient_list=[email],
            fail_silently=True,
        )

        return Response(status=status.HTTP_200_OK)


# -------------------------
# VERIFY RESET CODE
# -------------------------
class VerifyResetCodeView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = VerifyResetCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token_value = serializer.validated_data["token"]

        try:
            reset_token = PasswordResetToken.objects.get(token=token_value)
        except PasswordResetToken.DoesNotExist:
            return Response(
                {"token": ["Invalid or expired reset code."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not reset_token.is_valid:
            return Response(
                {"token": ["Invalid or expired reset code."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(status=status.HTTP_200_OK)


# -------------------------
# RESET PASSWORD
# -------------------------
class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token_value = serializer.validated_data["token"]
        new_password = serializer.validated_data["password"]

        try:
            reset_token = PasswordResetToken.objects.select_related("user").get(token=token_value)
        except PasswordResetToken.DoesNotExist:
            return Response(
                {"token": ["Invalid or expired reset code."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not reset_token.is_valid:
            return Response(
                {"token": ["Invalid or expired reset code."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = reset_token.user
        user.set_password(new_password)
        user.save(update_fields=["password"])

        reset_token.used = True
        reset_token.save(update_fields=["used"])

        # Invalidate all outstanding refresh tokens so any attacker session is cut off
        outstanding = OutstandingToken.objects.filter(user=user)
        BlacklistedToken.objects.bulk_create(
            [BlacklistedToken(token=t) for t in outstanding],
            ignore_conflicts=True,
        )

        return Response(status=status.HTTP_200_OK)


# -------------------------
# AVATAR UPLOAD URL
# -------------------------
class AvatarUploadUrlView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = AvatarUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            result = generate_avatar_presigned_url(
                user_id=str(request.user.id),
                content_type=serializer.validated_data["content_type"],
                file_size=serializer.validated_data["file_size"],
            )
        except S3Error as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response(result, status=status.HTTP_200_OK)

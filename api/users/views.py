from datetime import datetime, timezone as dt_timezone

from django.contrib.auth import get_user_model

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
from .serializers import RegisterSerializer, UserSerializer, PublicUserSerializer, AvatarUploadSerializer
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

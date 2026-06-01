from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

from rest_framework import serializers

from core.s3 import ALLOWED_CONTENT_TYPES, MAX_FILE_SIZE

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["email", "password", "display_name"]

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            display_name=validated_data["display_name"],
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "display_name",
            "bio",
            "location",
            "avatar_url",
            "has_onboarded",
            "created_at",
        ]
        read_only_fields = ["id", "email", "created_at"]

    def validate_avatar_url(self, value):
        if not value:
            return value
        expected_prefix = (
            f"https://{settings.AWS_STORAGE_BUCKET_NAME}"
            f".s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/"
        )
        if not value.startswith(expected_prefix):
            raise serializers.ValidationError("avatar_url must point to the project bucket.")
        return value


class PublicUserSerializer(serializers.ModelSerializer):
    community_count = serializers.SerializerMethodField()
    event_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "display_name",
            "bio",
            "location",
            "avatar_url",
            "created_at",
            "community_count",
            "event_count",
        ]
        read_only_fields = [
            "id",
            "display_name",
            "bio",
            "location",
            "avatar_url",
            "created_at",
            "community_count",
            "event_count",
        ]

    def get_community_count(self, obj):
        return obj.memberships.count()

    def get_event_count(self, obj):
        return 0


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class VerifyResetCodeSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=64)


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=64)
    password = serializers.CharField(write_only=True)

    def validate_password(self, value):
        validate_password(value)
        return value


class AvatarUploadSerializer(serializers.Serializer):
    content_type = serializers.CharField()
    file_size = serializers.IntegerField(min_value=1)

    def validate_content_type(self, value):
        if value not in ALLOWED_CONTENT_TYPES:
            raise serializers.ValidationError(
                "Only image/jpeg, image/png, and image/webp are allowed."
            )
        return value

    def validate_file_size(self, value):
        if value > MAX_FILE_SIZE:
            raise serializers.ValidationError("File size must not exceed 5 MB.")
        return value

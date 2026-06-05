from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

from rest_framework import serializers

from core.s3 import ALLOWED_CONTENT_TYPES, MAX_FILE_SIZE

User = get_user_model()


def visible_upcoming_rsvp_count(user):
    """Count a user's upcoming going/interested RSVPs, restricted to events they
    can actually see — i.e. in a community they've joined or that they organise.

    Mirrors the visibility rule of the events list endpoint so the profile
    counter never drifts from the "My Events" sheet, even for orphan RSVPs left
    over from before events were member-gated.
    """
    from django.db.models import Q
    from django.utils import timezone

    from apps.events.models import RSVP

    member_community_ids = user.memberships.values_list("community_id", flat=True)
    return (
        user.rsvps.filter(
            status__in=[RSVP.Status.GOING, RSVP.Status.INTERESTED],
            event__start_datetime__gte=timezone.now(),
        )
        .filter(Q(event__community_id__in=member_community_ids) | Q(event__organiser=user))
        .count()
    )


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
    event_count = serializers.SerializerMethodField(read_only=True)

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
            "event_count",
        ]
        read_only_fields = ["id", "email", "created_at", "event_count"]

    def get_event_count(self, obj):
        return visible_upcoming_rsvp_count(obj)

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
        return visible_upcoming_rsvp_count(obj)


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

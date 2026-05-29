from rest_framework import serializers

from apps.communities.models import Community
from core.s3 import ALLOWED_CONTENT_TYPES, MAX_FILE_SIZE

from .models import Event, RSVP


class CoverUploadSerializer(serializers.Serializer):
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
            raise serializers.ValidationError(
                f"File size must not exceed {MAX_FILE_SIZE // (1024 * 1024)} MB."
            )
        return value


class CommunityMinimalSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source="community_type", read_only=True)

    class Meta:
        model = Community
        fields = ["id", "name", "type"]


class OrganiserSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    display_name = serializers.CharField()
    avatar_url = serializers.URLField(allow_null=True)


class RSVPSerializer(serializers.ModelSerializer):
    class Meta:
        model = RSVP
        fields = ["id", "status", "created_at"]
        read_only_fields = ["id", "created_at"]


class AttendeeSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source="user.id", read_only=True)
    display_name = serializers.CharField(source="user.display_name", read_only=True)
    avatar_url = serializers.URLField(source="user.avatar_url", read_only=True, allow_null=True)

    class Meta:
        model = RSVP
        fields = ["user_id", "display_name", "avatar_url", "created_at"]
        read_only_fields = ["user_id", "display_name", "avatar_url", "created_at"]


class EventSerializer(serializers.ModelSerializer):
    community = serializers.PrimaryKeyRelatedField(queryset=Community.objects.all(), write_only=True)
    going_count = serializers.IntegerField(read_only=True)
    interested_count = serializers.IntegerField(read_only=True)
    rsvp_status = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id",
            "community",
            "channel",
            "title",
            "description",
            "location_text",
            "lat",
            "lng",
            "start_datetime",
            "end_datetime",
            "cover_image_url",
            "capacity",
            "going_count",
            "interested_count",
            "rsvp_status",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "cover_image_url",
            "going_count",
            "interested_count",
            "rsvp_status",
            "created_at",
        ]

    def get_rsvp_status(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        try:
            return obj.rsvps.get(user=request.user).status
        except RSVP.DoesNotExist:
            return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["community"] = CommunityMinimalSerializer(instance.community).data
        data["organiser"] = OrganiserSerializer(instance.organiser).data
        return data

    def validate(self, data):
        channel = data.get("channel") or (self.instance.channel if self.instance else None)
        community = data.get("community") or (self.instance.community if self.instance else None)

        if channel and community and channel.community_id != community.pk:
            raise serializers.ValidationError(
                {"channel": "Channel does not belong to the specified community."}
            )

        start = data.get("start_datetime") or (self.instance.start_datetime if self.instance else None)
        end = data.get("end_datetime") or (self.instance.end_datetime if self.instance else None)

        if start and end and end <= start:
            raise serializers.ValidationError(
                {"end_datetime": "end_datetime must be after start_datetime."}
            )

        return data


class EventListSerializer(serializers.ModelSerializer):
    going_count = serializers.IntegerField(read_only=True)
    interested_count = serializers.IntegerField(read_only=True)
    rsvp_status = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id",
            "community",
            "title",
            "location_text",
            "start_datetime",
            "end_datetime",
            "cover_image_url",
            "capacity",
            "going_count",
            "interested_count",
            "rsvp_status",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "cover_image_url",
            "going_count",
            "interested_count",
            "rsvp_status",
            "created_at",
        ]

    def get_rsvp_status(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        try:
            return obj.rsvps.get(user=request.user).status
        except RSVP.DoesNotExist:
            return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["community"] = CommunityMinimalSerializer(instance.community).data
        return data

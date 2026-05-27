from rest_framework import serializers

from .models import Event


class EventSerializer(serializers.ModelSerializer):
    organiser_id = serializers.UUIDField(source="organiser.id", read_only=True)
    organiser_display_name = serializers.CharField(source="organiser.display_name", read_only=True)
    organiser_avatar_url = serializers.URLField(source="organiser.avatar_url", read_only=True)

    class Meta:
        model = Event
        fields = [
            "id",
            "community",
            "channel",
            "organiser_id",
            "organiser_display_name",
            "organiser_avatar_url",
            "title",
            "description",
            "location_text",
            "lat",
            "lng",
            "start_datetime",
            "end_datetime",
            "cover_image_url",
            "capacity",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "organiser_id",
            "organiser_display_name",
            "organiser_avatar_url",
            "cover_image_url",
            "created_at",
        ]

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
    organiser_id = serializers.UUIDField(source="organiser.id", read_only=True)

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
            "organiser_id",
            "created_at",
        ]
        read_only_fields = ["id", "organiser_id", "cover_image_url", "created_at"]

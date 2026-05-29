from rest_framework import serializers

from .models import Notification, PushToken


class PushTokenSerializer(serializers.ModelSerializer):
    # Declared explicitly to drop the auto UniqueValidator — register upserts by token.
    token = serializers.CharField(max_length=255)

    class Meta:
        model = PushToken
        fields = ["id", "token", "platform", "created_at"]
        read_only_fields = ["id", "created_at"]


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "title",
            "body",
            "data",
            "is_read",
            "created_at",
        ]
        read_only_fields = fields

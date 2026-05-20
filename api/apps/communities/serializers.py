from rest_framework import serializers

from .models import Community


class CommunityMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Community
        fields = ["id", "name", "community_type", "cover_image_url", "is_private", "created_at"]
        read_only_fields = ["id", "created_at"]


class CommunitySerializer(serializers.ModelSerializer):
    owner_id = serializers.UUIDField(source="owner.id", read_only=True)

    class Meta:
        model = Community
        fields = [
            "id",
            "name",
            "description",
            "community_type",
            "owner_id",
            "cover_image_url",
            "is_private",
            "created_at",
        ]
        read_only_fields = ["id", "owner_id", "created_at"]

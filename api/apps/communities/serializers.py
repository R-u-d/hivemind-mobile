from rest_framework import serializers

from core.s3 import ALLOWED_CONTENT_TYPES, MAX_FILE_SIZE

from .models import Channel, Community, Membership, Post


class CommunityMinimalSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source="community_type", read_only=True)
    member_count = serializers.IntegerField(read_only=True)
    is_member = serializers.BooleanField(read_only=True)

    class Meta:
        model = Community
        fields = [
            "id",
            "name",
            "type",
            "member_count",
            "cover_image_url",
            "is_private",
            "created_at",
            "is_member",
        ]
        read_only_fields = ["id", "created_at", "is_member"]


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


class CommunityDetailSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source="community_type", read_only=True)
    member_count = serializers.IntegerField(read_only=True)
    is_member = serializers.BooleanField(read_only=True)
    owner_id = serializers.UUIDField(source="owner.id", read_only=True)

    class Meta:
        model = Community
        fields = [
            "id",
            "name",
            "description",
            "type",
            "member_count",
            "is_member",
            "owner_id",
            "cover_image_url",
            "is_private",
            "created_at",
        ]
        read_only_fields = ["id", "owner_id", "created_at", "is_member", "member_count"]


class MembershipSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source="user.id", read_only=True)
    display_name = serializers.CharField(source="user.display_name", read_only=True)
    avatar_url = serializers.URLField(source="user.avatar_url", read_only=True)

    class Meta:
        model = Membership
        fields = ["id", "user_id", "display_name", "avatar_url", "role", "joined_at"]
        read_only_fields = ["id", "user_id", "display_name", "avatar_url", "joined_at"]


class RoleUpdateSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=[Membership.Role.MEMBER, Membership.Role.MODERATOR])


class ChannelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Channel
        fields = ["id", "community_id", "name", "description", "channel_type", "created_at"]
        read_only_fields = ["id", "community_id", "created_at"]


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
            raise serializers.ValidationError("File size must not exceed 5 MB.")
        return value


class PostSerializer(serializers.ModelSerializer):
    author_id = serializers.UUIDField(source="author.id", read_only=True)
    author_display_name = serializers.CharField(source="author.display_name", read_only=True)
    author_avatar_url = serializers.URLField(source="author.avatar_url", read_only=True)

    class Meta:
        model = Post
        fields = [
            "id",
            "channel_id",
            "author_id",
            "author_display_name",
            "author_avatar_url",
            "body",
            "created_at",
        ]
        read_only_fields = ["id", "channel_id", "author_id", "author_display_name", "author_avatar_url", "created_at"]

import uuid

from django.conf import settings
from django.db import models


class Community(models.Model):
    class Type(models.TextChoices):
        STUDY = "study", "Study"
        GAMING = "gaming", "Gaming"
        SPORTS = "sports", "Sports"
        CREATIVE = "creative", "Creative"
        SOCIAL = "social", "Social"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    community_type = models.CharField(max_length=20, choices=Type.choices)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="owned_communities",
    )
    cover_image_url = models.URLField(blank=True)
    is_private = models.BooleanField(default=False)
    location = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Membership(models.Model):
    class Role(models.TextChoices):
        MEMBER = "member", "Member"
        MODERATOR = "moderator", "Moderator"
        OWNER = "owner", "Owner"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("community", "user")

    def __str__(self):
        return f"{self.user} in {self.community} ({self.role})"


class Channel(models.Model):
    class ChannelType(models.TextChoices):
        GENERAL = "general", "General"
        ANNOUNCEMENTS = "announcements", "Announcements"
        EVENTS = "events", "Events"
        RESOURCES = "resources", "Resources"
        HELP = "help", "Help"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name="channels")
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    channel_type = models.CharField(max_length=20, choices=ChannelType.choices, default=ChannelType.GENERAL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"#{self.name} ({self.community})"


class Post(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name="posts")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="posts",
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Post by {self.author} in #{self.channel.name}"

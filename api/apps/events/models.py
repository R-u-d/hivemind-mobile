import uuid

from django.conf import settings
from django.db import models

from apps.communities.models import Channel, Community


class Event(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name="events")
    channel = models.ForeignKey(
        Channel,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="events",
    )
    organiser = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="organised_events",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    location_text = models.CharField(max_length=255, blank=True)
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    cover_image_url = models.URLField(blank=True)
    capacity = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["start_datetime"]

    def __str__(self):
        return self.title

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.communities.models import Channel, Membership
from core.pagination import CreatedAtCursorPagination, StartsAtCursorPagination
from core.s3 import S3Error, generate_event_cover_presigned_url

from .models import Event, RSVP
from .permissions import IsEventOrganiserOrModerator
from .serializers import AttendeeSerializer, CoverUploadSerializer, EventListSerializer, EventSerializer, RSVPSerializer


class EventViewSet(viewsets.ModelViewSet):
    pagination_class = StartsAtCursorPagination
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = Event.objects.select_related("organiser", "community", "channel").annotate(
            going_count=Count("rsvps", filter=Q(rsvps__status=RSVP.Status.GOING))
        )

        community_id = self.request.query_params.get("community")
        if community_id:
            qs = qs.filter(community_id=community_id)

        channel_id = self.request.query_params.get("channel")
        if channel_id:
            qs = qs.filter(channel_id=channel_id)

        date_from = self.request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(start_datetime__gte=date_from)

        date_to = self.request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(start_datetime__lte=date_to)

        upcoming = self.request.query_params.get("upcoming")
        if upcoming == "true":
            qs = qs.filter(start_datetime__gte=timezone.now())
        elif upcoming == "false":
            qs = qs.filter(start_datetime__lt=timezone.now())

        rsvp_filter = self.request.query_params.get("rsvp")
        if rsvp_filter and self.request.user.is_authenticated:
            qs = qs.filter(rsvps__user=self.request.user, rsvps__status=rsvp_filter)

        q = self.request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(title__icontains=q) | qs.filter(description__icontains=q)

        return qs.order_by("start_datetime", "id")

    def get_permissions(self):
        if self.action in ("list", "retrieve", "attendees"):
            return [permissions.AllowAny()]
        if self.action in ("create", "rsvp"):
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsEventOrganiserOrModerator()]

    @action(detail=True, methods=["post"], url_path="cover-upload-url")
    def cover_upload_url(self, request, pk=None):
        event = self.get_object()
        serializer = CoverUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            result = generate_event_cover_presigned_url(
                event_id=str(event.id),
                content_type=serializer.validated_data["content_type"],
                file_size=serializer.validated_data["file_size"],
            )
        except S3Error as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        event.cover_image_url = result["public_url"]
        event.save(update_fields=["cover_image_url"])

        return Response(result, status=status.HTTP_200_OK)

    def get_serializer_class(self):
        if self.action == "list":
            return EventListSerializer
        return EventSerializer

    def perform_create(self, serializer):
        community = serializer.validated_data["community"]
        is_member = Membership.objects.filter(
            community=community, user=self.request.user
        ).exists()
        if not is_member:
            raise PermissionDenied("You must be a member of the community to create an event.")

        # When no channel is chosen, surface the event in the community's events
        # channel so it shows up alongside posts there.
        channel = serializer.validated_data.get("channel")
        if channel is None:
            channel = (
                Channel.objects.filter(
                    community=community, channel_type=Channel.ChannelType.EVENTS
                )
                .order_by("created_at")
                .first()
            )
        serializer.save(organiser=self.request.user, channel=channel)

    @action(detail=True, methods=["post", "delete"])
    def rsvp(self, request, pk=None):
        event = self.get_object()

        if request.method == "DELETE":
            deleted, _ = RSVP.objects.filter(event=event, user=request.user).delete()
            if not deleted:
                return Response({"detail": "No RSVP found."}, status=status.HTTP_404_NOT_FOUND)
            return Response(status=status.HTTP_204_NO_CONTENT)

        rsvp_status = request.data.get("status", RSVP.Status.GOING)
        if rsvp_status not in RSVP.Status.values:
            return Response({"status": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)

        if event.start_datetime < timezone.now():
            return Response(
                {"detail": "Cannot RSVP to a past event."}, status=status.HTTP_400_BAD_REQUEST
            )

        if rsvp_status == RSVP.Status.GOING and event.capacity is not None:
            going_count = (
                RSVP.objects.filter(event=event, status=RSVP.Status.GOING)
                .exclude(user=request.user)
                .count()
            )
            if going_count >= event.capacity:
                return Response(
                    {"detail": "Event is at capacity."}, status=status.HTTP_400_BAD_REQUEST
                )

        rsvp_obj, created = RSVP.objects.update_or_create(
            event=event,
            user=request.user,
            defaults={"status": rsvp_status},
        )
        return Response(
            RSVPSerializer(rsvp_obj).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"])
    def attendees(self, request, pk=None):
        event = self.get_object()
        qs = (
            RSVP.objects.filter(event=event, status=RSVP.Status.GOING)
            .select_related("user")
            .order_by("created_at")
        )
        paginator = CreatedAtCursorPagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        if page is not None:
            return paginator.get_paginated_response(AttendeeSerializer(page, many=True).data)
        return Response(AttendeeSerializer(qs, many=True).data)

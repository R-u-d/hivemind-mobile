from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.communities.models import Membership
from core.pagination import CreatedAtCursorPagination, StartsAtCursorPagination

from .models import Event, RSVP
from .permissions import IsEventOrganiserOrModerator
from .serializers import AttendeeSerializer, EventListSerializer, EventSerializer, RSVPSerializer


class EventViewSet(viewsets.ModelViewSet):
    pagination_class = StartsAtCursorPagination
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = Event.objects.select_related("organiser", "community", "channel").annotate(
            attendee_count=Count("rsvps", filter=Q(rsvps__status=RSVP.Status.GOING))
        )

        community_id = self.request.query_params.get("community")
        if community_id:
            qs = qs.filter(community_id=community_id)

        date_from = self.request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(start_datetime__gte=date_from)

        date_to = self.request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(start_datetime__lte=date_to)

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
        serializer.save(organiser=self.request.user)

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

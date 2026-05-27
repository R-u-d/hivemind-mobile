
from rest_framework import permissions, viewsets
from rest_framework.exceptions import PermissionDenied

from apps.communities.models import Membership
from core.pagination import StartsAtCursorPagination

from .models import Event
from .permissions import IsEventOrganiserOrModerator
from .serializers import EventListSerializer, EventSerializer


class EventViewSet(viewsets.ModelViewSet):
    pagination_class = StartsAtCursorPagination
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = Event.objects.select_related("organiser", "community", "channel")

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
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        if self.action == "create":
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

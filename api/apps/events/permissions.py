from rest_framework.permissions import BasePermission

from apps.communities.models import Membership

MODERATOR_ROLES = [Membership.Role.MODERATOR, Membership.Role.OWNER]


class IsEventOrganiserOrModerator(BasePermission):
    """Grants write access to the event organiser or a community moderator/owner."""

    def has_object_permission(self, request, view, obj):
        if obj.organiser == request.user:
            return True
        return Membership.objects.filter(
            community=obj.community,
            user=request.user,
            role__in=MODERATOR_ROLES,
        ).exists()

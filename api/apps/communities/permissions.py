from rest_framework.permissions import BasePermission, SAFE_METHODS

from .models import Channel, Membership

ROLE_RANK = {
    Membership.Role.MEMBER: 0,
    Membership.Role.MODERATOR: 1,
    Membership.Role.OWNER: 2,
}


class IsOwnerOrReadOnly(BasePermission):
    """Community CRUD: read-only for anyone, writes restricted to the community owner."""

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return obj.owner == request.user


class IsCommunityMember(BasePermission):
    """Grants access if the authenticated user has any membership in the community."""

    def has_permission(self, request, view):
        community_pk = view.kwargs.get("community_pk")
        if not community_pk or not request.user.is_authenticated:
            return False
        return Membership.objects.filter(
            community_id=community_pk, user=request.user
        ).exists()


class IsCommunityModerator(BasePermission):
    """Grants access if the authenticated user is a moderator or owner of the community."""

    def has_permission(self, request, view):
        community_pk = view.kwargs.get("community_pk")
        if not community_pk or not request.user.is_authenticated:
            return False
        return Membership.objects.filter(
            community_id=community_pk,
            user=request.user,
            role__in=[Membership.Role.MODERATOR, Membership.Role.OWNER],
        ).exists()


class IsCommunityOwner(BasePermission):
    """Grants access if the authenticated user is the owner of the community."""

    def has_permission(self, request, view):
        community_pk = view.kwargs.get("community_pk")
        if not community_pk or not request.user.is_authenticated:
            return False
        return Membership.objects.filter(
            community_id=community_pk,
            user=request.user,
            role=Membership.Role.OWNER,
        ).exists()


class IsChannelCommunityMember(BasePermission):
    """Grants access if the authenticated user is a member of the channel's community."""

    def has_permission(self, request, view):
        channel_pk = view.kwargs.get("channel_pk")
        if not channel_pk or not request.user.is_authenticated:
            return False
        try:
            channel = Channel.objects.select_related("community").get(pk=channel_pk)
        except Channel.DoesNotExist:
            return False
        return Membership.objects.filter(
            community=channel.community, user=request.user
        ).exists()


class IsChannelCommunityModerator(BasePermission):
    """Grants access if the authenticated user is a moderator or owner of the channel's community."""

    def has_permission(self, request, view):
        channel_pk = view.kwargs.get("channel_pk")
        if not channel_pk or not request.user.is_authenticated:
            return False
        try:
            channel = Channel.objects.select_related("community").get(pk=channel_pk)
        except Channel.DoesNotExist:
            return False
        return Membership.objects.filter(
            community=channel.community,
            user=request.user,
            role__in=[Membership.Role.MODERATOR, Membership.Role.OWNER],
        ).exists()

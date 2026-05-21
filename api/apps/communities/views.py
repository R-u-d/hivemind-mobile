from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import CreatedAtCursorPagination, JoinedAtCursorPagination

from .models import Community, Membership
from .permissions import IsOwnerOrReadOnly
from .serializers import (
    CommunityMinimalSerializer,
    CommunitySerializer,
    MembershipSerializer,
    RoleUpdateSerializer,
)

ROLE_RANK = {
    Membership.Role.MEMBER: 0,
    Membership.Role.MODERATOR: 1,
    Membership.Role.OWNER: 2,
}


class CommunityViewSet(viewsets.ModelViewSet):
    queryset = Community.objects.select_related("owner").order_by("-created_at")
    pagination_class = CreatedAtCursorPagination
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        if self.action == "create":
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsOwnerOrReadOnly()]

    def get_serializer_class(self):
        if self.action == "list":
            return CommunityMinimalSerializer
        return CommunitySerializer

    def perform_create(self, serializer):
        community = serializer.save(owner=self.request.user)
        Membership.objects.create(
            community=community,
            user=self.request.user,
            role=Membership.Role.OWNER,
        )


class MemberListView(generics.ListAPIView):
    serializer_class = MembershipSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = JoinedAtCursorPagination

    def get_queryset(self):
        community = get_object_or_404(Community, pk=self.kwargs["community_pk"])
        return Membership.objects.filter(community=community).select_related("user").order_by("joined_at")


class JoinView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, community_pk):
        community = get_object_or_404(Community, pk=community_pk)
        if Membership.objects.filter(community=community, user=request.user).exists():
            return Response({"detail": "Already a member."}, status=status.HTTP_400_BAD_REQUEST)
        membership = Membership.objects.create(
            community=community,
            user=request.user,
            role=Membership.Role.MEMBER,
        )
        return Response(MembershipSerializer(membership).data, status=status.HTTP_201_CREATED)


class LeaveView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, community_pk):
        community = get_object_or_404(Community, pk=community_pk)
        try:
            membership = Membership.objects.get(community=community, user=request.user)
        except Membership.DoesNotExist:
            return Response({"detail": "Not a member."}, status=status.HTTP_400_BAD_REQUEST)
        if membership.role == Membership.Role.OWNER:
            return Response(
                {"detail": "Owner cannot leave. Transfer ownership first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        membership.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MemberDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _get_actor(self, community, user):
        try:
            return Membership.objects.get(community=community, user=user)
        except Membership.DoesNotExist:
            return None

    def patch(self, request, community_pk, user_pk):
        community = get_object_or_404(Community, pk=community_pk)
        target = get_object_or_404(Membership, community=community, user__id=user_pk)
        actor = self._get_actor(community, request.user)

        if actor is None or ROLE_RANK[actor.role] < ROLE_RANK[Membership.Role.MODERATOR]:
            return Response({"detail": "You do not have permission."}, status=status.HTTP_403_FORBIDDEN)

        serializer = RoleUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_role = serializer.validated_data["role"]

        if ROLE_RANK[actor.role] <= ROLE_RANK[target.role]:
            return Response(
                {"detail": "Cannot change role of an equal or higher-ranked member."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if ROLE_RANK[new_role] > ROLE_RANK[actor.role]:
            return Response(
                {"detail": "Cannot assign a role higher than your own."},
                status=status.HTTP_403_FORBIDDEN,
            )

        target.role = new_role
        target.save()
        return Response(MembershipSerializer(target).data)

    def delete(self, request, community_pk, user_pk):
        community = get_object_or_404(Community, pk=community_pk)
        target = get_object_or_404(Membership, community=community, user__id=user_pk)
        actor = self._get_actor(community, request.user)

        if actor is None or ROLE_RANK[actor.role] < ROLE_RANK[Membership.Role.MODERATOR]:
            return Response({"detail": "You do not have permission."}, status=status.HTTP_403_FORBIDDEN)

        if ROLE_RANK[actor.role] <= ROLE_RANK[target.role]:
            return Response(
                {"detail": "Cannot remove an equal or higher-ranked member."},
                status=status.HTTP_403_FORBIDDEN,
            )

        target.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

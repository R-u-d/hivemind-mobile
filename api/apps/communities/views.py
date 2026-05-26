from django.db.models import BooleanField, Count, Exists, OuterRef, Value
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import JoinedAtCursorPagination, MemberCountCursorPagination

from .models import Community, Membership
from .permissions import IsCommunityModerator, IsOwnerOrReadOnly, ROLE_RANK
from .serializers import (
    CommunityMinimalSerializer,
    CommunitySerializer,
    MembershipSerializer,
    RoleUpdateSerializer,
)


class CommunityViewSet(viewsets.ModelViewSet):
    pagination_class = MemberCountCursorPagination
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        qs = Community.objects.select_related("owner").annotate(
            member_count=Count("memberships"),
        )

        if user.is_authenticated:
            qs = qs.annotate(
                is_member=Exists(
                    Membership.objects.filter(community=OuterRef("pk"), user=user)
                )
            )
        else:
            qs = qs.annotate(is_member=Value(False, output_field=BooleanField()))

        types = self.request.query_params.getlist("type")
        if types:
            qs = qs.filter(community_type__in=types)

        search = self.request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(name__icontains=search)

        return qs.order_by("-member_count", "name")

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
        membership, created = Membership.objects.get_or_create(
            community=community,
            user=request.user,
            defaults={"role": Membership.Role.MEMBER},
        )
        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(MembershipSerializer(membership).data, status=status_code)


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
    permission_classes = [permissions.IsAuthenticated, IsCommunityModerator]

    def patch(self, request, community_pk, user_pk):
        community = get_object_or_404(Community, pk=community_pk)
        target = get_object_or_404(Membership, community=community, user__id=user_pk)
        actor = Membership.objects.get(community=community, user=request.user)

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
        actor = Membership.objects.get(community=community, user=request.user)

        if ROLE_RANK[actor.role] <= ROLE_RANK[target.role]:
            return Response(
                {"detail": "Cannot remove an equal or higher-ranked member."},
                status=status.HTTP_403_FORBIDDEN,
            )

        target.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

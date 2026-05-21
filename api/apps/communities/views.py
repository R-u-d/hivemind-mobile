from rest_framework import permissions, viewsets

from core.pagination import CreatedAtCursorPagination

from .models import Community
from .permissions import IsOwnerOrReadOnly
from .serializers import CommunityMinimalSerializer, CommunitySerializer


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
        serializer.save(owner=self.request.user)

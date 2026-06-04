from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import CreatedAtCursorPagination

from .models import Notification, PushToken
from .serializers import NotificationSerializer, PushTokenSerializer


class PushTokenView(APIView):
    """Register (POST) or deregister (DELETE) the calling device's Expo push token."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PushTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data["token"]
        obj, _ = PushToken.objects.update_or_create(
            token=token,
            defaults={
                "user": request.user,
                "platform": serializer.validated_data.get("platform", PushToken.Platform.IOS),
            },
        )
        return Response(PushTokenSerializer(obj).data, status=status.HTTP_201_CREATED)

    def delete(self, request):
        token = request.data.get("token")
        deleted, _ = PushToken.objects.filter(user=request.user, token=token).delete()
        if not deleted:
            return Response({"detail": "Token not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class NotificationViewSet(
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CreatedAtCursorPagination

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    @action(detail=True, methods=["post"])
    def read(self, request, pk=None):
        notification = self.get_object()
        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=["is_read"])
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=["post"])
    def read_all(self, request):
        updated = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"updated": updated})

    @action(detail=True, methods=["post"])
    def unread(self, request, pk=None):
        notification = self.get_object()
        if notification.is_read:
            notification.is_read = False
            notification.save(update_fields=["is_read"])
        return Response(NotificationSerializer(notification).data)

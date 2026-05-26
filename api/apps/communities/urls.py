from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ChannelViewSet, CommunityViewSet, CoverUploadUrlView, JoinView, LeaveView, MemberDetailView, MemberListView, PostViewSet

router = DefaultRouter()
router.register("communities", CommunityViewSet, basename="community")

channel_list = ChannelViewSet.as_view({"get": "list", "post": "create"})
channel_detail = ChannelViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"})
post_list = PostViewSet.as_view({"get": "list", "post": "create"})
post_detail = PostViewSet.as_view({"delete": "destroy"})

urlpatterns = [
    path("", include(router.urls)),
    path("communities/<uuid:community_pk>/channels/", channel_list, name="channel-list"),
    path("communities/<uuid:community_pk>/channels/<uuid:pk>/", channel_detail, name="channel-detail"),
    path("communities/<uuid:community_pk>/cover-upload-url/", CoverUploadUrlView.as_view(), name="community-cover-upload-url"),
    path("communities/<uuid:community_pk>/members/", MemberListView.as_view(), name="community-members"),
    path("communities/<uuid:community_pk>/join/", JoinView.as_view(), name="community-join"),
    path("communities/<uuid:community_pk>/leave/", LeaveView.as_view(), name="community-leave"),
    path("communities/<uuid:community_pk>/members/<uuid:user_pk>/", MemberDetailView.as_view(), name="community-member-detail"),
    path("channels/<uuid:channel_pk>/posts/", post_list, name="post-list"),
    path("channels/<uuid:channel_pk>/posts/<uuid:pk>/", post_detail, name="post-detail"),
]

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CommunityViewSet, JoinView, LeaveView, MemberDetailView, MemberListView

router = DefaultRouter()
router.register("communities", CommunityViewSet, basename="community")

urlpatterns = [
    path("", include(router.urls)),
    path("communities/<uuid:community_pk>/members/", MemberListView.as_view(), name="community-members"),
    path("communities/<uuid:community_pk>/join/", JoinView.as_view(), name="community-join"),
    path("communities/<uuid:community_pk>/leave/", LeaveView.as_view(), name="community-leave"),
    path("communities/<uuid:community_pk>/members/<uuid:user_pk>/", MemberDetailView.as_view(), name="community-member-detail"),
]

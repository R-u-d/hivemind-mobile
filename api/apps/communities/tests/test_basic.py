import pytest
from unittest.mock import MagicMock, patch
from rest_framework.test import APIRequestFactory

from users.factories import UserFactory

from apps.communities.factories import ChannelFactory, CommunityFactory, MembershipFactory, PostFactory
from apps.communities.models import Channel, Community, Membership, Post
from apps.communities.permissions import IsCommunityMember, IsCommunityModerator, IsCommunityOwner

COMMUNITIES_URL = "/api/communities/"


def detail_url(pk):
    return f"/api/communities/{pk}/"


def channels_url(community_pk):
    return f"/api/communities/{community_pk}/channels/"


def channel_detail_url(community_pk, channel_pk):
    return f"/api/communities/{community_pk}/channels/{channel_pk}/"


def members_url(community_pk):
    return f"/api/communities/{community_pk}/members/"


def join_url(community_pk):
    return f"/api/communities/{community_pk}/join/"


def leave_url(community_pk):
    return f"/api/communities/{community_pk}/leave/"


def member_detail_url(community_pk, user_pk):
    return f"/api/communities/{community_pk}/members/{user_pk}/"


# ---- LIST ----

@pytest.mark.django_db
def test_list_unauthenticated(api_client):
    CommunityFactory.create_batch(3)
    response = api_client.get(COMMUNITIES_URL)
    assert response.status_code == 200
    assert len(response.data["results"]) == 3


@pytest.mark.django_db
def test_list_authenticated(auth_client):
    client, _ = auth_client
    CommunityFactory.create_batch(2)
    response = client.get(COMMUNITIES_URL)
    assert response.status_code == 200
    assert len(response.data["results"]) == 2


# ---- CREATE ----

@pytest.mark.django_db
def test_create_unauthenticated(api_client):
    response = api_client.post(COMMUNITIES_URL, {"name": "Test", "community_type": "study"})
    assert response.status_code == 401


@pytest.mark.django_db
def test_create_authenticated(auth_client):
    client, user = auth_client
    payload = {"name": "Study Crew", "community_type": "study", "description": "We study hard."}
    response = client.post(COMMUNITIES_URL, payload)
    assert response.status_code == 201
    assert response.data["owner_id"] == str(user.id)
    assert Community.objects.filter(name="Study Crew").exists()


@pytest.mark.django_db
def test_create_invalid_type(auth_client):
    client, _ = auth_client
    response = client.post(COMMUNITIES_URL, {"name": "Test", "community_type": "invalid"})
    assert response.status_code == 400


# ---- RETRIEVE ----

@pytest.mark.django_db
def test_retrieve_unauthenticated(api_client):
    community = CommunityFactory()
    response = api_client.get(detail_url(community.id))
    assert response.status_code == 200
    assert response.data["id"] == str(community.id)


@pytest.mark.django_db
def test_retrieve_authenticated(auth_client):
    client, _ = auth_client
    community = CommunityFactory()
    response = client.get(detail_url(community.id))
    assert response.status_code == 200


@pytest.mark.django_db
def test_retrieve_shape_unauthenticated(api_client):
    community = CommunityFactory()
    response = api_client.get(detail_url(community.id))
    assert response.status_code == 200
    data = response.data
    assert "type" in data
    assert "community_type" not in data
    assert "member_count" in data
    assert "is_member" in data
    assert data["is_member"] is False
    assert "description" in data
    assert "owner_id" in data


@pytest.mark.django_db
def test_retrieve_is_member_false_for_non_member(auth_client):
    client, _ = auth_client
    community = CommunityFactory()
    response = client.get(detail_url(community.id))
    assert response.status_code == 200
    assert response.data["is_member"] is False


@pytest.mark.django_db
def test_retrieve_is_member_true_for_member(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.MEMBER)
    response = client.get(detail_url(community.id))
    assert response.status_code == 200
    assert response.data["is_member"] is True
    assert response.data["member_count"] >= 1


# ---- UPDATE ----

@pytest.mark.django_db
def test_update_unauthenticated(api_client):
    community = CommunityFactory()
    response = api_client.patch(detail_url(community.id), {"name": "New Name"})
    assert response.status_code == 401


@pytest.mark.django_db
def test_update_non_owner(auth_client):
    client, _ = auth_client
    community = CommunityFactory()  # owned by a different user
    response = client.patch(detail_url(community.id), {"name": "Hacked"})
    assert response.status_code == 403


@pytest.mark.django_db
def test_update_owner(auth_client):
    client, user = auth_client
    community = CommunityFactory(owner=user)
    response = client.patch(detail_url(community.id), {"name": "Updated"})
    assert response.status_code == 200
    assert response.data["name"] == "Updated"


# ---- DELETE ----

@pytest.mark.django_db
def test_delete_unauthenticated(api_client):
    community = CommunityFactory()
    response = api_client.delete(detail_url(community.id))
    assert response.status_code == 401


@pytest.mark.django_db
def test_delete_non_owner(auth_client):
    client, _ = auth_client
    community = CommunityFactory()  # owned by a different user
    response = client.delete(detail_url(community.id))
    assert response.status_code == 403


@pytest.mark.django_db
def test_delete_owner(auth_client):
    client, user = auth_client
    community = CommunityFactory(owner=user)
    response = client.delete(detail_url(community.id))
    assert response.status_code == 204
    assert not Community.objects.filter(id=community.id).exists()


# ---- CREATE COMMUNITY: owner membership auto-created ----

@pytest.mark.django_db
def test_create_community_creates_owner_membership(auth_client):
    client, user = auth_client
    payload = {"name": "Auto Club", "community_type": "social"}
    response = client.post(COMMUNITIES_URL, payload)
    assert response.status_code == 201
    community_id = response.data["id"]
    assert Membership.objects.filter(
        community_id=community_id, user=user, role=Membership.Role.OWNER
    ).exists()


# ---- LIST MEMBERS ----

@pytest.mark.django_db
def test_list_members_unauthenticated(api_client):
    community = CommunityFactory()
    MembershipFactory.create_batch(3, community=community)
    response = api_client.get(members_url(community.id))
    assert response.status_code == 200
    assert len(response.data["results"]) == 3


@pytest.mark.django_db
def test_list_members_empty(api_client):
    community = CommunityFactory()
    response = api_client.get(members_url(community.id))
    assert response.status_code == 200
    assert response.data["results"] == []


# ---- JOIN ----

@pytest.mark.django_db
def test_join_unauthenticated(api_client):
    community = CommunityFactory()
    response = api_client.post(join_url(community.id))
    assert response.status_code == 401


@pytest.mark.django_db
def test_join_authenticated(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    response = client.post(join_url(community.id))
    assert response.status_code == 201
    assert Membership.objects.filter(community=community, user=user).exists()


@pytest.mark.django_db
def test_join_already_member(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user)
    response = client.post(join_url(community.id))
    assert response.status_code == 200


# ---- LEAVE ----

@pytest.mark.django_db
def test_leave_unauthenticated(api_client):
    community = CommunityFactory()
    response = api_client.delete(leave_url(community.id))
    assert response.status_code == 401


@pytest.mark.django_db
def test_leave_not_a_member(auth_client):
    client, _ = auth_client
    community = CommunityFactory()
    response = client.delete(leave_url(community.id))
    assert response.status_code == 400


@pytest.mark.django_db
def test_leave_owner_blocked(auth_client):
    client, user = auth_client
    community = CommunityFactory(owner=user)
    MembershipFactory(community=community, user=user, role=Membership.Role.OWNER)
    response = client.delete(leave_url(community.id))
    assert response.status_code == 400


@pytest.mark.django_db
def test_leave_member(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.MEMBER)
    response = client.delete(leave_url(community.id))
    assert response.status_code == 204
    assert not Membership.objects.filter(community=community, user=user).exists()


# ---- CHANGE ROLE (PATCH member) ----

@pytest.mark.django_db
def test_change_role_unauthenticated(api_client):
    community = CommunityFactory()
    target_user = UserFactory()
    MembershipFactory(community=community, user=target_user)
    response = api_client.patch(member_detail_url(community.id, target_user.id), {"role": "moderator"})
    assert response.status_code == 401


@pytest.mark.django_db
def test_change_role_non_member(auth_client):
    client, _ = auth_client
    community = CommunityFactory()
    target_user = UserFactory()
    MembershipFactory(community=community, user=target_user)
    response = client.patch(member_detail_url(community.id, target_user.id), {"role": "moderator"})
    assert response.status_code == 403


@pytest.mark.django_db
def test_change_role_plain_member_forbidden(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.MEMBER)
    target_user = UserFactory()
    MembershipFactory(community=community, user=target_user, role=Membership.Role.MEMBER)
    response = client.patch(member_detail_url(community.id, target_user.id), {"role": "moderator"})
    assert response.status_code == 403


@pytest.mark.django_db
def test_change_role_moderator_promotes_member(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.MODERATOR)
    target_user = UserFactory()
    MembershipFactory(community=community, user=target_user, role=Membership.Role.MEMBER)
    response = client.patch(member_detail_url(community.id, target_user.id), {"role": "moderator"})
    assert response.status_code == 200
    assert response.data["role"] == Membership.Role.MODERATOR


@pytest.mark.django_db
def test_change_role_moderator_cannot_act_on_moderator(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.MODERATOR)
    target_user = UserFactory()
    MembershipFactory(community=community, user=target_user, role=Membership.Role.MODERATOR)
    response = client.patch(member_detail_url(community.id, target_user.id), {"role": "member"})
    assert response.status_code == 403


@pytest.mark.django_db
def test_change_role_owner_can_demote_moderator(auth_client):
    client, user = auth_client
    community = CommunityFactory(owner=user)
    MembershipFactory(community=community, user=user, role=Membership.Role.OWNER)
    target_user = UserFactory()
    MembershipFactory(community=community, user=target_user, role=Membership.Role.MODERATOR)
    response = client.patch(member_detail_url(community.id, target_user.id), {"role": "member"})
    assert response.status_code == 200
    assert response.data["role"] == Membership.Role.MEMBER


# ---- REMOVE MEMBER (DELETE member) ----

@pytest.mark.django_db
def test_remove_member_unauthenticated(api_client):
    community = CommunityFactory()
    target_user = UserFactory()
    MembershipFactory(community=community, user=target_user)
    response = api_client.delete(member_detail_url(community.id, target_user.id))
    assert response.status_code == 401


@pytest.mark.django_db
def test_remove_member_non_member(auth_client):
    client, _ = auth_client
    community = CommunityFactory()
    target_user = UserFactory()
    MembershipFactory(community=community, user=target_user)
    response = client.delete(member_detail_url(community.id, target_user.id))
    assert response.status_code == 403


@pytest.mark.django_db
def test_remove_member_plain_member_forbidden(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.MEMBER)
    target_user = UserFactory()
    MembershipFactory(community=community, user=target_user, role=Membership.Role.MEMBER)
    response = client.delete(member_detail_url(community.id, target_user.id))
    assert response.status_code == 403


@pytest.mark.django_db
def test_remove_member_moderator_removes_member(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.MODERATOR)
    target_user = UserFactory()
    MembershipFactory(community=community, user=target_user, role=Membership.Role.MEMBER)
    response = client.delete(member_detail_url(community.id, target_user.id))
    assert response.status_code == 204
    assert not Membership.objects.filter(community=community, user=target_user).exists()


@pytest.mark.django_db
def test_remove_member_moderator_cannot_remove_moderator(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.MODERATOR)
    target_user = UserFactory()
    MembershipFactory(community=community, user=target_user, role=Membership.Role.MODERATOR)
    response = client.delete(member_detail_url(community.id, target_user.id))
    assert response.status_code == 403


@pytest.mark.django_db
def test_remove_member_owner_removes_moderator(auth_client):
    client, user = auth_client
    community = CommunityFactory(owner=user)
    MembershipFactory(community=community, user=user, role=Membership.Role.OWNER)
    target_user = UserFactory()
    MembershipFactory(community=community, user=target_user, role=Membership.Role.MODERATOR)
    response = client.delete(member_detail_url(community.id, target_user.id))
    assert response.status_code == 204
    assert not Membership.objects.filter(community=community, user=target_user).exists()


# ---- PERMISSION CLASS UNIT TESTS ----

class _MockView:
    def __init__(self, community_pk):
        self.kwargs = {"community_pk": str(community_pk)}


def _make_request(user):
    req = APIRequestFactory().get("/")
    req.user = user
    return req


# IsCommunityMember

@pytest.mark.django_db
def test_permission_member_grants_member(db):
    user = UserFactory()
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.MEMBER)
    assert IsCommunityMember().has_permission(_make_request(user), _MockView(community.pk))


@pytest.mark.django_db
def test_permission_member_denies_non_member(db):
    user = UserFactory()
    community = CommunityFactory()
    assert not IsCommunityMember().has_permission(_make_request(user), _MockView(community.pk))


@pytest.mark.django_db
def test_permission_member_grants_owner(db):
    user = UserFactory()
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.OWNER)
    assert IsCommunityMember().has_permission(_make_request(user), _MockView(community.pk))


# IsCommunityModerator

@pytest.mark.django_db
def test_permission_moderator_denies_member(db):
    user = UserFactory()
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.MEMBER)
    assert not IsCommunityModerator().has_permission(_make_request(user), _MockView(community.pk))


@pytest.mark.django_db
def test_permission_moderator_grants_moderator(db):
    user = UserFactory()
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.MODERATOR)
    assert IsCommunityModerator().has_permission(_make_request(user), _MockView(community.pk))


@pytest.mark.django_db
def test_permission_moderator_grants_owner(db):
    user = UserFactory()
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.OWNER)
    assert IsCommunityModerator().has_permission(_make_request(user), _MockView(community.pk))


@pytest.mark.django_db
def test_permission_moderator_denies_non_member(db):
    user = UserFactory()
    community = CommunityFactory()
    assert not IsCommunityModerator().has_permission(_make_request(user), _MockView(community.pk))


# IsCommunityOwner

@pytest.mark.django_db
def test_permission_owner_denies_member(db):
    user = UserFactory()
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.MEMBER)
    assert not IsCommunityOwner().has_permission(_make_request(user), _MockView(community.pk))


@pytest.mark.django_db
def test_permission_owner_denies_moderator(db):
    user = UserFactory()
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.MODERATOR)
    assert not IsCommunityOwner().has_permission(_make_request(user), _MockView(community.pk))


@pytest.mark.django_db
def test_permission_owner_grants_owner(db):
    user = UserFactory()
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.OWNER)
    assert IsCommunityOwner().has_permission(_make_request(user), _MockView(community.pk))


# ---- CHANNELS: LIST ----

@pytest.mark.django_db
def test_channel_list_unauthenticated(api_client):
    community = CommunityFactory()
    ChannelFactory.create_batch(2, community=community)
    response = api_client.get(channels_url(community.id))
    assert response.status_code == 401


@pytest.mark.django_db
def test_channel_list_non_member(auth_client):
    client, _ = auth_client
    community = CommunityFactory()
    ChannelFactory.create_batch(2, community=community)
    response = client.get(channels_url(community.id))
    assert response.status_code == 403


@pytest.mark.django_db
def test_channel_list_member(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user)
    ChannelFactory.create_batch(3, community=community)
    response = client.get(channels_url(community.id))
    assert response.status_code == 200
    assert len(response.data["results"]) == 3


# ---- CHANNELS: RETRIEVE ----

@pytest.mark.django_db
def test_channel_retrieve_unauthenticated(api_client):
    channel = ChannelFactory()
    response = api_client.get(channel_detail_url(channel.community_id, channel.id))
    assert response.status_code == 401


@pytest.mark.django_db
def test_channel_retrieve_non_member(auth_client):
    client, _ = auth_client
    channel = ChannelFactory()
    response = client.get(channel_detail_url(channel.community_id, channel.id))
    assert response.status_code == 403


@pytest.mark.django_db
def test_channel_retrieve_member(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user)
    channel = ChannelFactory(community=community)
    response = client.get(channel_detail_url(community.id, channel.id))
    assert response.status_code == 200
    assert response.data["id"] == str(channel.id)
    assert response.data["name"] == channel.name


# ---- CHANNELS: CREATE ----

@pytest.mark.django_db
def test_channel_create_unauthenticated(api_client):
    community = CommunityFactory()
    response = api_client.post(channels_url(community.id), {"name": "general"})
    assert response.status_code == 401


@pytest.mark.django_db
def test_channel_create_plain_member_forbidden(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.MEMBER)
    response = client.post(channels_url(community.id), {"name": "general"})
    assert response.status_code == 403


@pytest.mark.django_db
def test_channel_create_moderator(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.MODERATOR)
    response = client.post(channels_url(community.id), {"name": "general", "description": "Main channel"})
    assert response.status_code == 201
    assert response.data["name"] == "general"
    assert Channel.objects.filter(community=community, name="general").exists()


@pytest.mark.django_db
def test_channel_create_owner(auth_client):
    client, user = auth_client
    community = CommunityFactory(owner=user)
    MembershipFactory(community=community, user=user, role=Membership.Role.OWNER)
    response = client.post(channels_url(community.id), {"name": "announcements"})
    assert response.status_code == 201
    assert response.data["community_id"] == community.id


# ---- CHANNELS: CHANNEL TYPES ----

@pytest.mark.django_db
@pytest.mark.parametrize("channel_type", ["events", "media", "help"])
def test_channel_create_new_types(auth_client, channel_type):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.MODERATOR)
    response = client.post(channels_url(community.id), {"name": f"{channel_type}-channel", "channel_type": channel_type})
    assert response.status_code == 201
    assert response.data["channel_type"] == channel_type


@pytest.mark.django_db
def test_channel_create_invalid_type(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.MODERATOR)
    response = client.post(channels_url(community.id), {"name": "x", "channel_type": "invalid"})
    assert response.status_code == 400


@pytest.mark.django_db
@pytest.mark.parametrize("channel_type", ["events", "media", "help"])
def test_post_create_new_channel_types_member_allowed(auth_client, channel_type):
    client, user = auth_client
    channel = ChannelFactory(channel_type=channel_type)
    MembershipFactory(community=channel.community, user=user, role=Membership.Role.MEMBER)
    response = client.post(posts_url(channel.id), {"body": "hello"})
    assert response.status_code == 201


# ---- CHANNELS: UPDATE ----

@pytest.mark.django_db
def test_channel_update_unauthenticated(api_client):
    channel = ChannelFactory()
    response = api_client.patch(channel_detail_url(channel.community_id, channel.id), {"name": "new"})
    assert response.status_code == 401


@pytest.mark.django_db
def test_channel_update_plain_member_forbidden(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.MEMBER)
    channel = ChannelFactory(community=community)
    response = client.patch(channel_detail_url(community.id, channel.id), {"name": "hacked"})
    assert response.status_code == 403


@pytest.mark.django_db
def test_channel_update_moderator(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.MODERATOR)
    channel = ChannelFactory(community=community, name="old-name")
    response = client.patch(channel_detail_url(community.id, channel.id), {"name": "new-name"})
    assert response.status_code == 200
    assert response.data["name"] == "new-name"


# ---- CHANNELS: DELETE ----

@pytest.mark.django_db
def test_channel_delete_unauthenticated(api_client):
    channel = ChannelFactory()
    response = api_client.delete(channel_detail_url(channel.community_id, channel.id))
    assert response.status_code == 401


@pytest.mark.django_db
def test_channel_delete_plain_member_forbidden(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.MEMBER)
    channel = ChannelFactory(community=community)
    response = client.delete(channel_detail_url(community.id, channel.id))
    assert response.status_code == 403


@pytest.mark.django_db
def test_channel_delete_moderator(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.MODERATOR)
    channel = ChannelFactory(community=community)
    response = client.delete(channel_detail_url(community.id, channel.id))
    assert response.status_code == 204
    assert not Channel.objects.filter(id=channel.id).exists()


# ---- POSTS: helpers ----

def posts_url(channel_pk):
    return f"/api/channels/{channel_pk}/posts/"


def post_detail_url(channel_pk, post_pk):
    return f"/api/channels/{channel_pk}/posts/{post_pk}/"


# ---- POSTS: LIST ----

@pytest.mark.django_db
def test_post_list_unauthenticated(api_client):
    channel = ChannelFactory()
    response = api_client.get(posts_url(channel.id))
    assert response.status_code == 401


@pytest.mark.django_db
def test_post_list_non_member_forbidden(auth_client):
    client, user = auth_client
    channel = ChannelFactory()
    response = client.get(posts_url(channel.id))
    assert response.status_code == 403


@pytest.mark.django_db
def test_post_list_member(auth_client):
    client, user = auth_client
    channel = ChannelFactory()
    MembershipFactory(community=channel.community, user=user, role=Membership.Role.MEMBER)
    PostFactory.create_batch(3, channel=channel)
    response = client.get(posts_url(channel.id))
    assert response.status_code == 200
    assert len(response.data["results"]) == 3


@pytest.mark.django_db
def test_post_list_newest_first(auth_client):
    client, user = auth_client
    channel = ChannelFactory()
    MembershipFactory(community=channel.community, user=user, role=Membership.Role.MEMBER)
    p1 = PostFactory(channel=channel, body="first")
    p2 = PostFactory(channel=channel, body="second")
    response = client.get(posts_url(channel.id))
    assert response.status_code == 200
    ids = [r["id"] for r in response.data["results"]]
    assert ids.index(str(p2.id)) < ids.index(str(p1.id))


# ---- POSTS: CREATE ----

@pytest.mark.django_db
def test_post_create_unauthenticated(api_client):
    channel = ChannelFactory()
    response = api_client.post(posts_url(channel.id), {"body": "hello"})
    assert response.status_code == 401


@pytest.mark.django_db
def test_post_create_non_member_forbidden(auth_client):
    client, user = auth_client
    channel = ChannelFactory()
    response = client.post(posts_url(channel.id), {"body": "hello"})
    assert response.status_code == 403


@pytest.mark.django_db
def test_post_create_member_general_channel(auth_client):
    client, user = auth_client
    channel = ChannelFactory(channel_type=Channel.ChannelType.GENERAL)
    MembershipFactory(community=channel.community, user=user, role=Membership.Role.MEMBER)
    response = client.post(posts_url(channel.id), {"body": "hello"})
    assert response.status_code == 201
    assert response.data["body"] == "hello"
    assert response.data["author"]["id"] == str(user.id)
    assert Post.objects.filter(channel=channel, author=user).exists()


@pytest.mark.django_db
def test_post_create_member_announcements_forbidden(auth_client):
    client, user = auth_client
    channel = ChannelFactory(channel_type=Channel.ChannelType.ANNOUNCEMENTS)
    MembershipFactory(community=channel.community, user=user, role=Membership.Role.MEMBER)
    response = client.post(posts_url(channel.id), {"body": "hello"})
    assert response.status_code == 403


@pytest.mark.django_db
def test_post_create_moderator_announcements(auth_client):
    client, user = auth_client
    channel = ChannelFactory(channel_type=Channel.ChannelType.ANNOUNCEMENTS)
    MembershipFactory(community=channel.community, user=user, role=Membership.Role.MODERATOR)
    response = client.post(posts_url(channel.id), {"body": "important update"})
    assert response.status_code == 201
    assert response.data["body"] == "important update"


@pytest.mark.django_db
def test_post_create_owner_announcements(auth_client):
    client, user = auth_client
    channel = ChannelFactory(channel_type=Channel.ChannelType.ANNOUNCEMENTS)
    MembershipFactory(community=channel.community, user=user, role=Membership.Role.OWNER)
    response = client.post(posts_url(channel.id), {"body": "pinned notice"})
    assert response.status_code == 201


# ---- POSTS: DELETE ----

@pytest.mark.django_db
def test_post_delete_unauthenticated(api_client):
    post = PostFactory()
    MembershipFactory(community=post.channel.community, user=post.author, role=Membership.Role.MEMBER)
    response = api_client.delete(post_detail_url(post.channel.id, post.id))
    assert response.status_code == 401


@pytest.mark.django_db
def test_post_delete_non_author_plain_member_forbidden(auth_client):
    client, user = auth_client
    post = PostFactory()
    MembershipFactory(community=post.channel.community, user=user, role=Membership.Role.MEMBER)
    response = client.delete(post_detail_url(post.channel.id, post.id))
    assert response.status_code == 403


@pytest.mark.django_db
def test_post_delete_by_author(auth_client):
    client, user = auth_client
    channel = ChannelFactory()
    MembershipFactory(community=channel.community, user=user, role=Membership.Role.MEMBER)
    post = PostFactory(channel=channel, author=user)
    response = client.delete(post_detail_url(channel.id, post.id))
    assert response.status_code == 204
    assert not Post.objects.filter(id=post.id).exists()


@pytest.mark.django_db
def test_post_delete_by_moderator(auth_client):
    client, user = auth_client
    channel = ChannelFactory()
    MembershipFactory(community=channel.community, user=user, role=Membership.Role.MODERATOR)
    post = PostFactory(channel=channel)
    MembershipFactory(community=channel.community, user=post.author, role=Membership.Role.MEMBER)
    response = client.delete(post_detail_url(channel.id, post.id))
    assert response.status_code == 204
    assert not Post.objects.filter(id=post.id).exists()


@pytest.mark.django_db
def test_post_delete_by_owner(auth_client):
    client, user = auth_client
    channel = ChannelFactory()
    MembershipFactory(community=channel.community, user=user, role=Membership.Role.OWNER)
    post = PostFactory(channel=channel)
    MembershipFactory(community=channel.community, user=post.author, role=Membership.Role.MEMBER)
    response = client.delete(post_detail_url(channel.id, post.id))
    assert response.status_code == 204


# ---- COVER UPLOAD URL ----

def cover_upload_url(community_pk):
    return f"/api/communities/{community_pk}/cover-upload-url/"

VALID_COVER_PAYLOAD = {"content_type": "image/jpeg", "file_size": 102400}


@pytest.fixture(autouse=False)
def reset_s3_singleton():
    import core.s3
    core.s3._s3_client = None
    yield
    core.s3._s3_client = None


@pytest.mark.django_db
def test_cover_upload_url_unauthenticated(api_client):
    community = CommunityFactory()
    response = api_client.post(cover_upload_url(community.id), VALID_COVER_PAYLOAD)
    assert response.status_code == 401


@pytest.mark.django_db
def test_cover_upload_url_non_member_forbidden(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    response = client.post(cover_upload_url(community.id), VALID_COVER_PAYLOAD)
    assert response.status_code == 403


@pytest.mark.django_db
def test_cover_upload_url_plain_member_forbidden(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.MEMBER)
    response = client.post(cover_upload_url(community.id), VALID_COVER_PAYLOAD)
    assert response.status_code == 403


@pytest.mark.django_db
@patch("core.s3.boto3.client")
def test_cover_upload_url_moderator(mock_boto3_client, auth_client, reset_s3_singleton):
    mock_s3 = MagicMock()
    mock_boto3_client.return_value = mock_s3
    mock_s3.generate_presigned_url.return_value = "https://s3.amazonaws.com/fake-presigned"

    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.MODERATOR)
    response = client.post(cover_upload_url(community.id), VALID_COVER_PAYLOAD)
    assert response.status_code == 200
    assert response.data["upload_url"] == "https://s3.amazonaws.com/fake-presigned"
    assert response.data["key"].startswith("covers/")
    assert "public_url" in response.data


@pytest.mark.django_db
@patch("core.s3.boto3.client")
def test_cover_upload_url_owner(mock_boto3_client, auth_client, reset_s3_singleton):
    mock_s3 = MagicMock()
    mock_boto3_client.return_value = mock_s3
    mock_s3.generate_presigned_url.return_value = "https://s3.amazonaws.com/fake-presigned"

    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.OWNER)
    response = client.post(cover_upload_url(community.id), VALID_COVER_PAYLOAD)
    assert response.status_code == 200
    assert response.data["key"].startswith(f"covers/{community.id}/")


@pytest.mark.django_db
def test_cover_upload_url_invalid_content_type(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.OWNER)
    response = client.post(cover_upload_url(community.id), {"content_type": "application/pdf", "file_size": 1024})
    assert response.status_code == 400


@pytest.mark.django_db
def test_cover_upload_url_file_too_large(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.OWNER)
    response = client.post(cover_upload_url(community.id), {"content_type": "image/jpeg", "file_size": 6 * 1024 * 1024})
    assert response.status_code == 400


@pytest.mark.django_db
def test_cover_upload_url_missing_fields(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.OWNER)
    response = client.post(cover_upload_url(community.id), {})
    assert response.status_code == 400

import pytest
from rest_framework.test import APIRequestFactory

from users.factories import UserFactory

from .factories import CommunityFactory, MembershipFactory
from .models import Community, Membership
from .permissions import IsCommunityMember, IsCommunityModerator, IsCommunityOwner

COMMUNITIES_URL = "/api/communities/"


def detail_url(pk):
    return f"/api/communities/{pk}/"


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

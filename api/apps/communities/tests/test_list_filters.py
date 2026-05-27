import pytest
from rest_framework import status

from apps.communities.factories import CommunityFactory, MembershipFactory
from apps.communities.models import Membership


pytestmark = pytest.mark.django_db


def _ids(response):
    return {item["id"] for item in response.data["results"]}


def test_search_filters_by_name_case_insensitive(api_client):
    a = CommunityFactory(name="Brooklyn Linocut")
    b = CommunityFactory(name="NYC Tabletop")
    c = CommunityFactory(name="linocut-students")

    res = api_client.get("/api/communities/?search=linocut")

    assert res.status_code == status.HTTP_200_OK
    assert _ids(res) == {str(a.id), str(c.id)}
    assert str(b.id) not in _ids(res)


def test_search_empty_string_returns_all(api_client):
    a = CommunityFactory()
    b = CommunityFactory()

    res = api_client.get("/api/communities/?search=")

    assert res.status_code == status.HTTP_200_OK
    assert _ids(res) == {str(a.id), str(b.id)}


def test_search_no_match_returns_empty_page(api_client):
    CommunityFactory(name="Brooklyn Linocut")

    res = api_client.get("/api/communities/?search=zzz-nonexistent")

    assert res.status_code == status.HTTP_200_OK
    assert res.data["results"] == []


def test_is_member_true_for_joined_authenticated_user(auth_client):
    client, user = auth_client
    joined = CommunityFactory()
    other = CommunityFactory()
    MembershipFactory(community=joined, user=user, role=Membership.Role.MEMBER)

    res = client.get("/api/communities/")

    assert res.status_code == status.HTTP_200_OK
    by_id = {item["id"]: item for item in res.data["results"]}
    assert by_id[str(joined.id)]["is_member"] is True
    assert by_id[str(other.id)]["is_member"] is False


def test_is_member_false_for_non_member_authenticated_user(auth_client):
    client, _user = auth_client
    c = CommunityFactory()

    res = client.get("/api/communities/")

    assert res.status_code == status.HTTP_200_OK
    by_id = {item["id"]: item for item in res.data["results"]}
    assert by_id[str(c.id)]["is_member"] is False


def test_is_member_false_for_anonymous_user(api_client):
    CommunityFactory()
    CommunityFactory()

    res = api_client.get("/api/communities/")

    assert res.status_code == status.HTTP_200_OK
    assert all(item["is_member"] is False for item in res.data["results"])

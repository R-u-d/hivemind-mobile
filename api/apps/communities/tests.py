import pytest

from .factories import CommunityFactory
from .models import Community

COMMUNITIES_URL = "/api/communities/"


def detail_url(pk):
    return f"/api/communities/{pk}/"


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

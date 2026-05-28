import pytest
from django.utils import timezone

from apps.communities.factories import CommunityFactory, MembershipFactory
from apps.communities.models import Membership

from ..factories import EventFactory


EVENTS_URL = "/api/events/"


def event_url(pk):
    return f"/api/events/{pk}/"


def make_event_payload(community, **kwargs):
    start = timezone.now() + timezone.timedelta(days=1)
    end = start + timezone.timedelta(hours=2)
    return {
        "community": str(community.id),
        "title": "Test Event",
        "description": "A description.",
        "location_text": "Some Place",
        "start_datetime": start.isoformat(),
        "end_datetime": end.isoformat(),
        **kwargs,
    }


# ─── List ────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_list_events_public(api_client):
    EventFactory.create_batch(3)
    response = api_client.get(EVENTS_URL)
    assert response.status_code == 200
    assert len(response.data["results"]) == 3


@pytest.mark.django_db
def test_list_filter_by_community(api_client):
    community = CommunityFactory()
    EventFactory.create_batch(2, community=community)
    EventFactory()
    response = api_client.get(EVENTS_URL, {"community": str(community.id)})
    assert response.status_code == 200
    assert len(response.data["results"]) == 2


@pytest.mark.django_db
def test_list_filter_by_date_from(api_client):
    now = timezone.now()
    EventFactory(
        start_datetime=now + timezone.timedelta(days=1),
        end_datetime=now + timezone.timedelta(days=1, hours=2),
    )
    EventFactory(
        start_datetime=now + timezone.timedelta(days=5),
        end_datetime=now + timezone.timedelta(days=5, hours=2),
    )
    cutoff = (now + timezone.timedelta(days=3)).isoformat()
    response = api_client.get(EVENTS_URL, {"date_from": cutoff})
    assert response.status_code == 200
    assert len(response.data["results"]) == 1


@pytest.mark.django_db
def test_list_filter_by_date_to(api_client):
    now = timezone.now()
    EventFactory(
        start_datetime=now + timezone.timedelta(days=1),
        end_datetime=now + timezone.timedelta(days=1, hours=2),
    )
    EventFactory(
        start_datetime=now + timezone.timedelta(days=5),
        end_datetime=now + timezone.timedelta(days=5, hours=2),
    )
    cutoff = (now + timezone.timedelta(days=3)).isoformat()
    response = api_client.get(EVENTS_URL, {"date_to": cutoff})
    assert response.status_code == 200
    assert len(response.data["results"]) == 1


@pytest.mark.django_db
def test_list_filter_by_search_title(api_client):
    EventFactory(title="Django Meetup")
    EventFactory(title="React Workshop")
    response = api_client.get(EVENTS_URL, {"q": "django"})
    assert response.status_code == 200
    assert len(response.data["results"]) == 1
    assert response.data["results"][0]["title"] == "Django Meetup"


@pytest.mark.django_db
def test_list_filter_by_search_description(api_client):
    EventFactory(title="Event A", description="Learn about Python")
    EventFactory(title="Event B", description="Learn about JavaScript")
    response = api_client.get(EVENTS_URL, {"q": "python"})
    assert response.status_code == 200
    assert len(response.data["results"]) == 1


# ─── Retrieve ────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_retrieve_event_public(api_client):
    event = EventFactory()
    response = api_client.get(event_url(event.id))
    assert response.status_code == 200
    assert response.data["id"] == str(event.id)
    assert "organiser_display_name" in response.data


# ─── Create ──────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_create_event_unauthenticated(api_client):
    community = CommunityFactory()
    response = api_client.post(EVENTS_URL, make_event_payload(community), format="json")
    assert response.status_code == 401


@pytest.mark.django_db
def test_create_event_non_member(auth_client):
    client, _ = auth_client
    community = CommunityFactory()
    response = client.post(EVENTS_URL, make_event_payload(community), format="json")
    assert response.status_code == 403


@pytest.mark.django_db
def test_create_event_member(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.MEMBER)
    response = client.post(EVENTS_URL, make_event_payload(community), format="json")
    assert response.status_code == 201
    assert response.data["organiser_id"] == str(user.id)


@pytest.mark.django_db
def test_create_event_end_before_start_rejected(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user)
    now = timezone.now()
    payload = make_event_payload(
        community,
        start_datetime=(now + timezone.timedelta(days=2)).isoformat(),
        end_datetime=(now + timezone.timedelta(days=1)).isoformat(),
    )
    response = client.post(EVENTS_URL, payload, format="json")
    assert response.status_code == 400


@pytest.mark.django_db
def test_create_event_channel_wrong_community_rejected(auth_client):
    from apps.communities.factories import ChannelFactory
    client, user = auth_client
    community = CommunityFactory()
    other_community = CommunityFactory()
    channel = ChannelFactory(community=other_community)
    MembershipFactory(community=community, user=user)
    payload = make_event_payload(community, channel=str(channel.id))
    response = client.post(EVENTS_URL, payload, format="json")
    assert response.status_code == 400


# ─── Update ──────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_update_event_unauthenticated(api_client):
    event = EventFactory()
    response = api_client.patch(event_url(event.id), {"title": "New"}, format="json")
    assert response.status_code == 401


@pytest.mark.django_db
def test_update_event_non_organiser_non_moderator(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.MEMBER)
    event = EventFactory(community=community)
    response = client.patch(event_url(event.id), {"title": "New"}, format="json")
    assert response.status_code == 403


@pytest.mark.django_db
def test_update_event_organiser(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user)
    event = EventFactory(community=community, organiser=user)
    response = client.patch(event_url(event.id), {"title": "Updated"}, format="json")
    assert response.status_code == 200
    assert response.data["title"] == "Updated"


@pytest.mark.django_db
def test_update_event_moderator(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.MODERATOR)
    event = EventFactory(community=community)
    response = client.patch(event_url(event.id), {"title": "Mod Update"}, format="json")
    assert response.status_code == 200
    assert response.data["title"] == "Mod Update"


# ─── Delete ──────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_delete_event_unauthenticated(api_client):
    event = EventFactory()
    response = api_client.delete(event_url(event.id))
    assert response.status_code == 401


@pytest.mark.django_db
def test_delete_event_non_organiser_non_moderator(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.MEMBER)
    event = EventFactory(community=community)
    response = client.delete(event_url(event.id))
    assert response.status_code == 403


@pytest.mark.django_db
def test_delete_event_organiser(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user)
    event = EventFactory(community=community, organiser=user)
    response = client.delete(event_url(event.id))
    assert response.status_code == 204


@pytest.mark.django_db
def test_delete_event_moderator(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.MODERATOR)
    event = EventFactory(community=community)
    response = client.delete(event_url(event.id))
    assert response.status_code == 204

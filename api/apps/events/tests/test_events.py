import pytest
from django.utils import timezone

from apps.communities.factories import CommunityFactory, MembershipFactory
from apps.communities.models import Membership

from ..factories import EventFactory


EVENTS_URL = "/api/events/"


def event_url(pk):
    return f"/api/events/{pk}/"


def join(user, community, role=Membership.Role.MEMBER):
    """Make `user` a member of `community` so they can see its events."""
    return MembershipFactory(community=community, user=user, role=role)


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
def test_list_unauthenticated(api_client):
    EventFactory.create_batch(3)
    response = api_client.get(EVENTS_URL)
    assert response.status_code == 401


@pytest.mark.django_db
def test_list_shows_member_community_events(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    join(user, community)
    EventFactory.create_batch(3, community=community)
    response = client.get(EVENTS_URL)
    assert response.status_code == 200
    assert len(response.data["results"]) == 3


@pytest.mark.django_db
def test_list_excludes_non_member_community_events(auth_client):
    client, user = auth_client
    joined = CommunityFactory()
    join(user, joined)
    EventFactory.create_batch(2, community=joined)
    EventFactory()  # event in a community the user has not joined
    response = client.get(EVENTS_URL)
    assert response.status_code == 200
    assert len(response.data["results"]) == 2


@pytest.mark.django_db
def test_list_includes_own_organised_event_when_not_member(auth_client):
    client, user = auth_client
    # User organises an event but is not (or no longer) a member of its community.
    EventFactory(organiser=user)
    response = client.get(EVENTS_URL)
    assert response.status_code == 200
    assert len(response.data["results"]) == 1


@pytest.mark.django_db
def test_list_returns_coordinates(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    join(user, community)
    EventFactory(community=community, lat=40.71, lng=-73.99)
    response = client.get(EVENTS_URL)
    assert response.status_code == 200
    result = response.data["results"][0]
    assert result["lat"] == 40.71
    assert result["lng"] == -73.99


@pytest.mark.django_db
def test_list_filter_by_community(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    join(user, community)
    EventFactory.create_batch(2, community=community)
    EventFactory()
    response = client.get(EVENTS_URL, {"community": str(community.id)})
    assert response.status_code == 200
    assert len(response.data["results"]) == 2


@pytest.mark.django_db
def test_list_filter_by_date_from(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    join(user, community)
    now = timezone.now()
    EventFactory(
        community=community,
        start_datetime=now + timezone.timedelta(days=1),
        end_datetime=now + timezone.timedelta(days=1, hours=2),
    )
    EventFactory(
        community=community,
        start_datetime=now + timezone.timedelta(days=5),
        end_datetime=now + timezone.timedelta(days=5, hours=2),
    )
    cutoff = (now + timezone.timedelta(days=3)).isoformat()
    response = client.get(EVENTS_URL, {"date_from": cutoff})
    assert response.status_code == 200
    assert len(response.data["results"]) == 1


@pytest.mark.django_db
def test_list_filter_by_date_to(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    join(user, community)
    now = timezone.now()
    EventFactory(
        community=community,
        start_datetime=now + timezone.timedelta(days=1),
        end_datetime=now + timezone.timedelta(days=1, hours=2),
    )
    EventFactory(
        community=community,
        start_datetime=now + timezone.timedelta(days=5),
        end_datetime=now + timezone.timedelta(days=5, hours=2),
    )
    cutoff = (now + timezone.timedelta(days=3)).isoformat()
    response = client.get(EVENTS_URL, {"date_to": cutoff})
    assert response.status_code == 200
    assert len(response.data["results"]) == 1


@pytest.mark.django_db
def test_list_filter_by_search_title(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    join(user, community)
    EventFactory(community=community, title="Django Meetup")
    EventFactory(community=community, title="React Workshop")
    response = client.get(EVENTS_URL, {"q": "django"})
    assert response.status_code == 200
    assert len(response.data["results"]) == 1
    assert response.data["results"][0]["title"] == "Django Meetup"


@pytest.mark.django_db
def test_list_filter_by_search_description(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    join(user, community)
    EventFactory(community=community, title="Event A", description="Learn about Python")
    EventFactory(community=community, title="Event B", description="Learn about JavaScript")
    response = client.get(EVENTS_URL, {"q": "python"})
    assert response.status_code == 200
    assert len(response.data["results"]) == 1


# ─── Retrieve ────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_retrieve_event_unauthenticated(api_client):
    event = EventFactory()
    response = api_client.get(event_url(event.id))
    assert response.status_code == 401


@pytest.mark.django_db
def test_retrieve_event_non_member_forbidden(auth_client):
    client, _ = auth_client
    event = EventFactory()
    response = client.get(event_url(event.id))
    assert response.status_code == 403


@pytest.mark.django_db
def test_retrieve_event_member(auth_client):
    client, user = auth_client
    event = EventFactory()
    join(user, event.community)
    response = client.get(event_url(event.id))
    assert response.status_code == 200
    assert response.data["id"] == str(event.id)
    assert "organiser" in response.data
    assert "display_name" in response.data["organiser"]


@pytest.mark.django_db
def test_retrieve_event_organiser_not_member(auth_client):
    client, user = auth_client
    # Organiser retains access even without a membership row.
    event = EventFactory(organiser=user)
    response = client.get(event_url(event.id))
    assert response.status_code == 200
    assert response.data["id"] == str(event.id)


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
    assert response.data["organiser"]["id"] == str(user.id)


@pytest.mark.django_db
def test_create_event_without_end_datetime(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.MEMBER)
    payload = make_event_payload(community)
    payload.pop("end_datetime")
    response = client.post(EVENTS_URL, payload, format="json")
    assert response.status_code == 201
    assert response.data["end_datetime"] is None


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
def test_create_event_auto_assigns_events_channel(auth_client):
    from apps.communities.factories import ChannelFactory
    from apps.communities.models import Channel

    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user)
    events_channel = ChannelFactory(community=community, channel_type=Channel.ChannelType.EVENTS)
    ChannelFactory(community=community, channel_type=Channel.ChannelType.GENERAL)

    response = client.post(EVENTS_URL, make_event_payload(community), format="json")
    assert response.status_code == 201
    assert str(response.data["channel"]) == str(events_channel.id)


@pytest.mark.django_db
def test_create_event_no_events_channel_leaves_null(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user)

    response = client.post(EVENTS_URL, make_event_payload(community), format="json")
    assert response.status_code == 201
    assert response.data["channel"] is None


@pytest.mark.django_db
def test_list_filter_by_channel(auth_client):
    from apps.communities.factories import ChannelFactory

    client, user = auth_client
    channel = ChannelFactory()
    join(user, channel.community)
    EventFactory.create_batch(2, community=channel.community, channel=channel)
    EventFactory(community=channel.community)
    response = client.get(EVENTS_URL, {"channel": str(channel.id)})
    assert response.status_code == 200
    assert len(response.data["results"]) == 2


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

import pytest
from django.utils import timezone

from ..factories import EventFactory, RSVPFactory
from ..models import RSVP


def rsvp_url(event_id):
    return f"/api/events/{event_id}/rsvp/"


def attendees_url(event_id):
    return f"/api/events/{event_id}/attendees/"


def event_url(event_id):
    return f"/api/events/{event_id}/"


# ─── RSVP create / upsert ────────────────────────────────────────────────────

@pytest.mark.django_db
def test_rsvp_unauthenticated(api_client):
    event = EventFactory()
    response = api_client.post(rsvp_url(event.id), {"status": "going"}, format="json")
    assert response.status_code == 401


@pytest.mark.django_db
def test_rsvp_going_creates_rsvp(auth_client):
    client, user = auth_client
    event = EventFactory()
    response = client.post(rsvp_url(event.id), {"status": "going"}, format="json")
    assert response.status_code == 201
    assert response.data["status"] == "going"
    assert RSVP.objects.filter(event=event, user=user).exists()


@pytest.mark.django_db
def test_rsvp_interested(auth_client):
    client, user = auth_client
    event = EventFactory()
    response = client.post(rsvp_url(event.id), {"status": "interested"}, format="json")
    assert response.status_code == 201
    assert response.data["status"] == "interested"


@pytest.mark.django_db
def test_rsvp_not_going(auth_client):
    client, user = auth_client
    event = EventFactory()
    response = client.post(rsvp_url(event.id), {"status": "not_going"}, format="json")
    assert response.status_code == 201
    assert response.data["status"] == "not_going"


@pytest.mark.django_db
def test_rsvp_defaults_to_going_when_no_status(auth_client):
    client, user = auth_client
    event = EventFactory()
    response = client.post(rsvp_url(event.id), {}, format="json")
    assert response.status_code == 201
    assert response.data["status"] == "going"


@pytest.mark.django_db
def test_rsvp_invalid_status_rejected(auth_client):
    client, _ = auth_client
    event = EventFactory()
    response = client.post(rsvp_url(event.id), {"status": "invalid"}, format="json")
    assert response.status_code == 400


@pytest.mark.django_db
def test_rsvp_update_status_returns_200(auth_client):
    client, user = auth_client
    event = EventFactory()
    RSVPFactory(event=event, user=user, status=RSVP.Status.GOING)
    response = client.post(rsvp_url(event.id), {"status": "interested"}, format="json")
    assert response.status_code == 200
    assert response.data["status"] == "interested"
    assert RSVP.objects.filter(event=event, user=user, status=RSVP.Status.INTERESTED).exists()


# ─── RSVP past-event guard ───────────────────────────────────────────────────

@pytest.mark.django_db
def test_rsvp_past_event_rejected(auth_client):
    client, _ = auth_client
    now = timezone.now()
    event = EventFactory(
        start_datetime=now - timezone.timedelta(days=2),
        end_datetime=now - timezone.timedelta(days=1),
    )
    response = client.post(rsvp_url(event.id), {"status": "going"}, format="json")
    assert response.status_code == 400
    assert "past" in response.data["detail"].lower()


# ─── RSVP capacity enforcement ───────────────────────────────────────────────

@pytest.mark.django_db
def test_rsvp_at_capacity_rejected(auth_client):
    client, user = auth_client
    event = EventFactory(capacity=1)
    other_user = RSVPFactory(event=event, status=RSVP.Status.GOING).user
    assert other_user != user
    response = client.post(rsvp_url(event.id), {"status": "going"}, format="json")
    assert response.status_code == 400
    assert "capacity" in response.data["detail"].lower()


@pytest.mark.django_db
def test_rsvp_interested_allowed_when_at_capacity(auth_client):
    client, user = auth_client
    event = EventFactory(capacity=1)
    RSVPFactory(event=event, status=RSVP.Status.GOING)
    response = client.post(rsvp_url(event.id), {"status": "interested"}, format="json")
    assert response.status_code == 201


@pytest.mark.django_db
def test_rsvp_reaffirm_going_when_already_going_and_at_capacity(auth_client):
    client, user = auth_client
    event = EventFactory(capacity=1)
    RSVPFactory(event=event, user=user, status=RSVP.Status.GOING)
    response = client.post(rsvp_url(event.id), {"status": "going"}, format="json")
    assert response.status_code == 200


# ─── RSVP delete ─────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_rsvp_delete_unauthenticated(api_client):
    event = EventFactory()
    response = api_client.delete(rsvp_url(event.id))
    assert response.status_code == 401


@pytest.mark.django_db
def test_rsvp_delete_own_rsvp(auth_client):
    client, user = auth_client
    event = EventFactory()
    RSVPFactory(event=event, user=user)
    response = client.delete(rsvp_url(event.id))
    assert response.status_code == 204
    assert not RSVP.objects.filter(event=event, user=user).exists()


@pytest.mark.django_db
def test_rsvp_delete_not_rsvpd_returns_404(auth_client):
    client, _ = auth_client
    event = EventFactory()
    response = client.delete(rsvp_url(event.id))
    assert response.status_code == 404


# ─── Attendees list ──────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_attendees_public(api_client):
    event = EventFactory()
    RSVPFactory(event=event, status=RSVP.Status.GOING)
    response = api_client.get(attendees_url(event.id))
    assert response.status_code == 200


@pytest.mark.django_db
def test_attendees_shows_only_going(api_client):
    event = EventFactory()
    RSVPFactory(event=event, status=RSVP.Status.GOING)
    RSVPFactory(event=event, status=RSVP.Status.INTERESTED)
    RSVPFactory(event=event, status=RSVP.Status.NOT_GOING)
    response = api_client.get(attendees_url(event.id))
    assert response.status_code == 200
    assert len(response.data["results"]) == 1


@pytest.mark.django_db
def test_attendees_includes_user_fields(api_client):
    event = EventFactory()
    RSVPFactory(event=event, status=RSVP.Status.GOING)
    response = api_client.get(attendees_url(event.id))
    result = response.data["results"][0]
    assert "user_id" in result
    assert "display_name" in result
    assert "avatar_url" in result


# ─── going_count in event serializers ────────────────────────────────────────

@pytest.mark.django_db
def test_going_count_in_event_list(api_client):
    event = EventFactory()
    RSVPFactory(event=event, status=RSVP.Status.GOING)
    RSVPFactory(event=event, status=RSVP.Status.GOING)
    RSVPFactory(event=event, status=RSVP.Status.INTERESTED)
    response = api_client.get("/api/events/")
    assert response.status_code == 200
    assert response.data["results"][0]["going_count"] == 2


@pytest.mark.django_db
def test_going_count_in_event_detail(api_client):
    event = EventFactory()
    RSVPFactory(event=event, status=RSVP.Status.GOING)
    response = api_client.get(event_url(event.id))
    assert response.status_code == 200
    assert response.data["going_count"] == 1


# ─── rsvp_status on event responses ──────────────────────────────────────────

@pytest.mark.django_db
def test_rsvp_status_null_for_anonymous(api_client):
    event = EventFactory()
    response = api_client.get(event_url(event.id))
    assert response.status_code == 200
    assert response.data["rsvp_status"] is None


@pytest.mark.django_db
def test_rsvp_status_shows_own_status(auth_client):
    client, user = auth_client
    event = EventFactory()
    RSVPFactory(event=event, user=user, status=RSVP.Status.INTERESTED)
    response = client.get(event_url(event.id))
    assert response.status_code == 200
    assert response.data["rsvp_status"] == "interested"


@pytest.mark.django_db
def test_rsvp_status_null_when_not_rsvpd(auth_client):
    client, _ = auth_client
    event = EventFactory()
    response = client.get(event_url(event.id))
    assert response.status_code == 200
    assert response.data["rsvp_status"] is None


# ─── community nested in response ────────────────────────────────────────────

@pytest.mark.django_db
def test_event_detail_returns_nested_community(api_client):
    event = EventFactory()
    response = api_client.get(event_url(event.id))
    assert response.status_code == 200
    community = response.data["community"]
    assert "id" in community
    assert "name" in community
    assert "type" in community


@pytest.mark.django_db
def test_event_list_returns_nested_community(api_client):
    EventFactory()
    response = api_client.get("/api/events/")
    assert response.status_code == 200
    community = response.data["results"][0]["community"]
    assert "id" in community
    assert "name" in community
    assert "type" in community


# ─── organiser nested in event detail ────────────────────────────────────────

@pytest.mark.django_db
def test_event_detail_returns_nested_organiser(api_client):
    event = EventFactory()
    response = api_client.get(event_url(event.id))
    assert response.status_code == 200
    organiser = response.data["organiser"]
    assert "id" in organiser
    assert "display_name" in organiser
    assert "avatar_url" in organiser

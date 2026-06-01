import pytest

from apps.notifications.factories import NotificationFactory

pytestmark = pytest.mark.django_db


def test_list_requires_auth(api_client):
    assert api_client.get("/api/notifications/").status_code == 401


def test_list_only_own(auth_client):
    client, user = auth_client
    NotificationFactory(recipient=user)
    NotificationFactory()  # belongs to another user
    res = client.get("/api/notifications/")
    assert res.status_code == 200
    assert len(res.data["results"]) == 1


def test_mark_read(auth_client):
    client, user = auth_client
    notification = NotificationFactory(recipient=user, is_read=False)
    res = client.post(f"/api/notifications/{notification.id}/read/")
    assert res.status_code == 200
    notification.refresh_from_db()
    assert notification.is_read is True


def test_cannot_mark_others_notification_read(auth_client):
    client, _ = auth_client
    notification = NotificationFactory(is_read=False)  # another user's
    res = client.post(f"/api/notifications/{notification.id}/read/")
    assert res.status_code == 404
    notification.refresh_from_db()
    assert notification.is_read is False


def test_read_all(auth_client):
    client, user = auth_client
    NotificationFactory.create_batch(3, recipient=user, is_read=False)
    res = client.post("/api/notifications/read_all/")
    assert res.status_code == 200
    assert res.data["updated"] == 3

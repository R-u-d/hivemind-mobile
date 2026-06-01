import pytest

from apps.notifications.factories import PushTokenFactory
from apps.notifications.models import PushToken

pytestmark = pytest.mark.django_db


def test_register_requires_auth(api_client):
    res = api_client.post(
        "/api/push-tokens/", {"token": "ExponentPushToken[x]"}, format="json"
    )
    assert res.status_code == 401


def test_register_token(auth_client):
    client, user = auth_client
    res = client.post(
        "/api/push-tokens/",
        {"token": "ExponentPushToken[abc]", "platform": "android"},
        format="json",
    )
    assert res.status_code == 201
    token = PushToken.objects.get(token="ExponentPushToken[abc]")
    assert token.user == user
    assert token.platform == PushToken.Platform.ANDROID


def test_register_is_idempotent(auth_client):
    client, _ = auth_client
    payload = {"token": "ExponentPushToken[abc]"}
    client.post("/api/push-tokens/", payload, format="json")
    client.post("/api/push-tokens/", payload, format="json")
    assert PushToken.objects.filter(token="ExponentPushToken[abc]").count() == 1


def test_register_reassigns_token_to_new_user(auth_client):
    client, user = auth_client
    other = PushTokenFactory(token="ExponentPushToken[abc]")
    client.post("/api/push-tokens/", {"token": "ExponentPushToken[abc]"}, format="json")
    token = PushToken.objects.get(token="ExponentPushToken[abc]")
    assert token.user == user
    assert token.user != other.user


def test_deregister(auth_client):
    client, user = auth_client
    PushTokenFactory(user=user, token="ExponentPushToken[abc]")
    res = client.delete(
        "/api/push-tokens/", {"token": "ExponentPushToken[abc]"}, format="json"
    )
    assert res.status_code == 204
    assert not PushToken.objects.filter(token="ExponentPushToken[abc]").exists()


def test_deregister_missing(auth_client):
    client, _ = auth_client
    res = client.delete("/api/push-tokens/", {"token": "nope"}, format="json")
    assert res.status_code == 404

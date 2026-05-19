import pytest
from rest_framework_simplejwt.tokens import RefreshToken

from users.factories import UserFactory


REGISTER_URL = "/api/auth/register/"
LOGIN_URL = "/api/auth/login/"
REFRESH_URL = "/api/auth/token/refresh/"
LOGOUT_URL = "/api/auth/logout/"
ME_URL = "/api/users/me/"


def public_profile_url(user_id):
    return f"/api/users/{user_id}/"


# ---------------------------------------------------------------------------
# Register
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_register_success(api_client):
    payload = {"email": "new@hivemind.com", "password": "Str0ngPass!", "display_name": "New User"}
    response = api_client.post(REGISTER_URL, payload)

    assert response.status_code == 201
    assert response.data["user"]["email"] == payload["email"]
    assert "access" in response.data
    assert "refresh" in response.data
    assert "password" not in response.data["user"]


@pytest.mark.django_db
def test_register_duplicate_email_returns_400(api_client, user):
    payload = {"email": user.email, "password": "Str0ngPass!", "display_name": "Dup"}
    response = api_client.post(REGISTER_URL, payload)

    assert response.status_code == 400
    assert "email" in response.data


@pytest.mark.django_db
def test_register_missing_fields_returns_400(api_client):
    response = api_client.post(REGISTER_URL, {"email": "incomplete@hivemind.com"})

    assert response.status_code == 400


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_login_success(api_client, user):
    response = api_client.post(LOGIN_URL, {"email": user.email, "password": "TestPass123!"})

    assert response.status_code == 200
    assert "access" in response.data
    assert "refresh" in response.data


@pytest.mark.django_db
def test_login_wrong_password_returns_401(api_client, user):
    response = api_client.post(LOGIN_URL, {"email": user.email, "password": "wrongpassword"})

    assert response.status_code == 401


@pytest.mark.django_db
def test_login_nonexistent_user_returns_401(api_client):
    response = api_client.post(LOGIN_URL, {"email": "ghost@hivemind.com", "password": "Pass123!"})

    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Token Refresh
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_token_refresh_success(api_client, user):
    refresh = str(RefreshToken.for_user(user))
    response = api_client.post(REFRESH_URL, {"refresh": refresh})

    assert response.status_code == 200
    assert "access" in response.data


@pytest.mark.django_db
def test_token_refresh_invalid_token_returns_401(api_client):
    response = api_client.post(REFRESH_URL, {"refresh": "notavalidtoken"})

    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_logout_success(auth_client):
    client, user = auth_client
    refresh = str(RefreshToken.for_user(user))
    response = client.post(LOGOUT_URL, {"refresh": refresh})

    assert response.status_code == 204
    assert response.content == b""


@pytest.mark.django_db
def test_logout_blocks_access_token_immediately(api_client, user):
    refresh = RefreshToken.for_user(user)
    access = str(refresh.access_token)

    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
    api_client.post(LOGOUT_URL, {"refresh": str(refresh)})

    response = api_client.get(ME_URL)
    assert response.status_code == 401


@pytest.mark.django_db
def test_logout_unauthenticated_returns_401(api_client, user):
    refresh = str(RefreshToken.for_user(user))
    response = api_client.post(LOGOUT_URL, {"refresh": refresh})

    assert response.status_code == 401


@pytest.mark.django_db
def test_logout_missing_refresh_token_returns_400(auth_client):
    client, _ = auth_client
    response = client.post(LOGOUT_URL, {})

    assert response.status_code == 400
    assert "refresh" in response.data


@pytest.mark.django_db
def test_logout_invalid_token_returns_400(auth_client):
    client, _ = auth_client
    response = client.post(LOGOUT_URL, {"refresh": "invalidtoken"})

    assert response.status_code == 400


# ---------------------------------------------------------------------------
# GET /users/me/
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_me_returns_authenticated_user(auth_client):
    client, user = auth_client
    response = client.get(ME_URL)

    assert response.status_code == 200
    assert response.data["email"] == user.email
    assert response.data["id"] == str(user.id)
    assert "password" not in response.data


@pytest.mark.django_db
def test_me_unauthenticated_returns_401(api_client):
    response = api_client.get(ME_URL)

    assert response.status_code == 401


# ---------------------------------------------------------------------------
# PATCH /users/me/
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_patch_me_updates_profile(auth_client):
    client, user = auth_client
    response = client.patch(ME_URL, {"display_name": "Updated Name", "bio": "New bio"})

    assert response.status_code == 200
    assert response.data["display_name"] == "Updated Name"
    assert response.data["bio"] == "New bio"
    assert response.data["email"] == user.email


@pytest.mark.django_db
def test_patch_me_cannot_change_email(auth_client):
    client, user = auth_client
    response = client.patch(ME_URL, {"email": "hacked@evil.com"})

    assert response.status_code == 200
    assert response.data["email"] == user.email


@pytest.mark.django_db
def test_patch_me_unauthenticated_returns_401(api_client):
    response = api_client.patch(ME_URL, {"display_name": "Hacker"})

    assert response.status_code == 401


# ---------------------------------------------------------------------------
# GET /users/<uuid>/
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_public_profile_returns_user(api_client, user):
    response = api_client.get(public_profile_url(user.id))

    assert response.status_code == 200
    assert response.data["id"] == str(user.id)
    assert response.data["display_name"] == user.display_name
    assert "email" not in response.data
    assert "password" not in response.data


@pytest.mark.django_db
def test_public_profile_nonexistent_returns_404(api_client):
    response = api_client.get(public_profile_url("00000000-0000-0000-0000-000000000000"))

    assert response.status_code == 404

import pytest
from datetime import timedelta
from unittest.mock import MagicMock, patch
from botocore.exceptions import ClientError
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from apps.communities.factories import CommunityFactory, MembershipFactory
from users.models import PasswordResetToken


REGISTER_URL = "/api/auth/register/"
LOGIN_URL = "/api/auth/login/"
REFRESH_URL = "/api/auth/token/refresh/"
LOGOUT_URL = "/api/auth/logout/"
ME_URL = "/api/users/me/"
FORGOT_PASSWORD_URL = "/api/auth/forgot-password/"
VERIFY_RESET_CODE_URL = "/api/auth/verify-reset-code/"
RESET_PASSWORD_URL = "/api/auth/reset-password/"


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


@pytest.mark.django_db
def test_public_profile_returns_community_and_event_counts(api_client, user):
    community = CommunityFactory(owner=user)
    MembershipFactory(community=community, user=user, role="owner")

    response = api_client.get(public_profile_url(user.id))

    assert response.status_code == 200
    assert response.data["community_count"] == 1
    assert response.data["event_count"] == 0


@pytest.mark.django_db
def test_event_count_excludes_non_member_rsvps(api_client, user):
    """event_count only counts RSVPs the user can still see — member of the
    event's community or organiser. Orphan RSVPs (e.g. from before events were
    member-gated) must not inflate the counter."""
    from apps.events.factories import EventFactory, RSVPFactory
    from apps.events.models import RSVP

    joined = CommunityFactory()
    MembershipFactory(community=joined, user=user)
    member_event = EventFactory(community=joined)
    RSVPFactory(event=member_event, user=user, status=RSVP.Status.GOING)

    # RSVP to an event in a community the user never joined → not counted.
    orphan_event = EventFactory()
    RSVPFactory(event=orphan_event, user=user, status=RSVP.Status.GOING)

    response = api_client.get(public_profile_url(user.id))
    assert response.status_code == 200
    assert response.data["event_count"] == 1


@pytest.mark.django_db
def test_public_profile_returns_location(api_client, user):
    user.location = "Berlin, Germany"
    user.save()

    response = api_client.get(public_profile_url(user.id))

    assert response.status_code == 200
    assert response.data["location"] == "Berlin, Germany"


# ---------------------------------------------------------------------------
# PATCH /users/me/ — location field
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_patch_me_updates_location(auth_client):
    client, _ = auth_client
    response = client.patch(ME_URL, {"location": "Hamburg, Germany"})

    assert response.status_code == 200
    assert response.data["location"] == "Hamburg, Germany"


@pytest.mark.django_db
def test_me_returns_location_field(auth_client):
    client, user = auth_client
    user.location = "Munich"
    user.save()

    response = client.get(ME_URL)

    assert response.status_code == 200
    assert response.data["location"] == "Munich"


# ---------------------------------------------------------------------------
# GET /users/me/communities/
# ---------------------------------------------------------------------------

MY_COMMUNITIES_URL = "/api/users/me/communities/"


@pytest.mark.django_db
def test_my_communities_unauthenticated_returns_401(api_client):
    response = api_client.get(MY_COMMUNITIES_URL)

    assert response.status_code == 401


@pytest.mark.django_db
def test_my_communities_returns_joined_communities(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user)

    response = client.get(MY_COMMUNITIES_URL)

    assert response.status_code == 200
    assert len(response.data) == 1
    assert str(response.data[0]["id"]) == str(community.id)


@pytest.mark.django_db
def test_my_communities_excludes_non_member_communities(auth_client):
    client, user = auth_client
    joined = CommunityFactory()
    MembershipFactory(community=joined, user=user)
    CommunityFactory()  # not a member

    response = client.get(MY_COMMUNITIES_URL)

    assert response.status_code == 200
    assert len(response.data) == 1
    assert str(response.data[0]["id"]) == str(joined.id)


@pytest.mark.django_db
def test_my_communities_response_has_expected_fields(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user)

    response = client.get(MY_COMMUNITIES_URL)

    assert response.status_code == 200
    item = response.data[0]
    assert "id" in item
    assert "name" in item
    assert "type" in item
    assert "member_count" in item
    assert "is_member" in item
    assert item["is_member"] is True


@pytest.mark.django_db
def test_my_communities_member_count_reflects_total_not_just_self(auth_client):
    """member_count must be the community's total membership, not 1 (the requesting user's own row)."""
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user)
    # Add two more members so total is 3
    MembershipFactory(community=community)
    MembershipFactory(community=community)

    response = client.get(MY_COMMUNITIES_URL)

    assert response.status_code == 200
    assert response.data[0]["member_count"] == 3


# ---------------------------------------------------------------------------
# POST /users/me/avatar-upload-url/
# ---------------------------------------------------------------------------

AVATAR_URL_ENDPOINT = "/api/users/me/avatar-upload-url/"


@pytest.fixture(autouse=True)
def _reset_s3_singleton():
    import core.s3
    core.s3._s3_client = None
    yield
    core.s3._s3_client = None


@pytest.mark.django_db
@patch("core.s3.boto3.client")
def test_avatar_upload_url_success(mock_boto3_client, auth_client):
    mock_s3 = MagicMock()
    mock_boto3_client.return_value = mock_s3
    mock_s3.generate_presigned_url.return_value = "https://s3.amazonaws.com/fake-presigned"

    client, _ = auth_client
    response = client.post(
        AVATAR_URL_ENDPOINT,
        {"content_type": "image/jpeg", "file_size": 1024 * 100},
    )

    assert response.status_code == 200
    assert response.data["upload_url"] == "https://s3.amazonaws.com/fake-presigned"
    assert response.data["key"].startswith("avatars/")
    assert response.data["key"].endswith(".jpg")
    assert "public_url" in response.data


@pytest.mark.django_db
def test_avatar_upload_url_invalid_content_type(auth_client):
    client, _ = auth_client
    response = client.post(
        AVATAR_URL_ENDPOINT,
        {"content_type": "image/gif", "file_size": 1024},
    )

    assert response.status_code == 400
    assert "content_type" in response.data


@pytest.mark.django_db
def test_avatar_upload_url_file_too_large(auth_client):
    client, _ = auth_client
    response = client.post(
        AVATAR_URL_ENDPOINT,
        {"content_type": "image/png", "file_size": 6 * 1024 * 1024},
    )

    assert response.status_code == 400
    assert "file_size" in response.data


@pytest.mark.django_db
def test_avatar_upload_url_unauthenticated(api_client):
    response = api_client.post(
        AVATAR_URL_ENDPOINT,
        {"content_type": "image/jpeg", "file_size": 1024},
    )

    assert response.status_code == 401


@pytest.mark.django_db
def test_avatar_upload_url_missing_fields(auth_client):
    client, _ = auth_client
    response = client.post(AVATAR_URL_ENDPOINT, {})

    assert response.status_code == 400


@pytest.mark.django_db
@patch("core.s3.boto3.client")
def test_avatar_upload_url_key_contains_user_uuid(mock_boto3_client, auth_client):
    mock_s3 = MagicMock()
    mock_boto3_client.return_value = mock_s3
    mock_s3.generate_presigned_url.return_value = "https://s3.amazonaws.com/fake"

    client, user = auth_client
    response = client.post(
        AVATAR_URL_ENDPOINT,
        {"content_type": "image/jpeg", "file_size": 1024},
    )

    assert response.status_code == 200
    assert str(user.id) in response.data["key"]


@pytest.mark.django_db
@patch("core.s3.boto3.client")
def test_avatar_upload_url_passes_content_type_and_length_to_s3(mock_boto3_client, auth_client):
    mock_s3 = MagicMock()
    mock_boto3_client.return_value = mock_s3
    mock_s3.generate_presigned_url.return_value = "https://s3.amazonaws.com/fake"

    client, _ = auth_client
    client.post(
        AVATAR_URL_ENDPOINT,
        {"content_type": "image/png", "file_size": 2048},
    )

    params = mock_s3.generate_presigned_url.call_args.kwargs["Params"]
    assert params["ContentType"] == "image/png"
    assert params["ContentLength"] == 2048


@pytest.mark.django_db
@patch("core.s3.boto3.client")
def test_avatar_upload_url_webp_supported(mock_boto3_client, auth_client):
    mock_s3 = MagicMock()
    mock_boto3_client.return_value = mock_s3
    mock_s3.generate_presigned_url.return_value = "https://s3.amazonaws.com/fake"

    client, _ = auth_client
    response = client.post(
        AVATAR_URL_ENDPOINT,
        {"content_type": "image/webp", "file_size": 1024},
    )

    assert response.status_code == 200
    assert response.data["key"].endswith(".webp")


@pytest.mark.django_db
@patch("core.s3.boto3.client")
def test_avatar_upload_url_s3_failure_returns_503(mock_boto3_client, auth_client):
    mock_s3 = MagicMock()
    mock_boto3_client.return_value = mock_s3
    mock_s3.generate_presigned_url.side_effect = ClientError(
        {"Error": {"Code": "InvalidAccessKeyId", "Message": "boom"}},
        "GeneratePresignedUrl",
    )

    client, _ = auth_client
    response = client.post(
        AVATAR_URL_ENDPOINT,
        {"content_type": "image/jpeg", "file_size": 1024},
    )

    assert response.status_code == 503
    assert "InvalidAccessKeyId" not in str(response.data)
    assert "boom" not in str(response.data)


@pytest.mark.django_db
def test_patch_me_rejects_avatar_url_outside_bucket(auth_client, settings):
    settings.AWS_STORAGE_BUCKET_NAME = "hivemind-prod"
    settings.AWS_S3_REGION_NAME = "eu-central-1"

    client, _ = auth_client
    response = client.patch(ME_URL, {"avatar_url": "https://evil.com/x.png"})

    assert response.status_code == 400
    assert "avatar_url" in response.data


# ---------------------------------------------------------------------------
# POST /api/auth/forgot-password/
# ---------------------------------------------------------------------------

@pytest.mark.django_db
@patch("users.views.send_mail")
def test_forgot_password_known_email_returns_200(mock_send_mail, api_client, user):
    response = api_client.post(FORGOT_PASSWORD_URL, {"email": user.email})

    assert response.status_code == 200
    mock_send_mail.assert_called_once()


@pytest.mark.django_db
@patch("users.views.send_mail")
def test_forgot_password_creates_reset_token(mock_send_mail, api_client, user):
    api_client.post(FORGOT_PASSWORD_URL, {"email": user.email})

    assert PasswordResetToken.objects.filter(user=user).count() == 1


@pytest.mark.django_db
@patch("users.views.send_mail")
def test_forgot_password_unknown_email_returns_400(mock_send_mail, api_client):
    response = api_client.post(FORGOT_PASSWORD_URL, {"email": "ghost@nowhere.com"})

    assert response.status_code == 400
    assert "email" in response.data
    mock_send_mail.assert_not_called()


@pytest.mark.django_db
def test_forgot_password_invalid_email_returns_400(api_client):
    response = api_client.post(FORGOT_PASSWORD_URL, {"email": "not-an-email"})

    assert response.status_code == 400


@pytest.mark.django_db
@patch("users.views.send_mail")
def test_forgot_password_missing_email_returns_400(mock_send_mail, api_client):
    response = api_client.post(FORGOT_PASSWORD_URL, {})

    assert response.status_code == 400


# ---------------------------------------------------------------------------
# POST /api/auth/verify-reset-code/
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_verify_reset_code_valid_returns_200(api_client, user):
    reset_token = PasswordResetToken.create_for_user(user)
    response = api_client.post(VERIFY_RESET_CODE_URL, {"token": reset_token.token})

    assert response.status_code == 200


@pytest.mark.django_db
def test_verify_reset_code_invalid_returns_400(api_client):
    response = api_client.post(VERIFY_RESET_CODE_URL, {"token": "not-a-real-token"})

    assert response.status_code == 400
    assert "token" in response.data


@pytest.mark.django_db
def test_verify_reset_code_used_returns_400(api_client, user):
    reset_token = PasswordResetToken.create_for_user(user)
    reset_token.used = True
    reset_token.save()

    response = api_client.post(VERIFY_RESET_CODE_URL, {"token": reset_token.token})

    assert response.status_code == 400
    assert "token" in response.data


@pytest.mark.django_db
def test_verify_reset_code_expired_returns_400(api_client, user):
    reset_token = PasswordResetToken.create_for_user(user)
    reset_token.expires_at = timezone.now() - timedelta(seconds=1)
    reset_token.save()

    response = api_client.post(VERIFY_RESET_CODE_URL, {"token": reset_token.token})

    assert response.status_code == 400
    assert "token" in response.data


@pytest.mark.django_db
def test_verify_reset_code_does_not_consume_token(api_client, user):
    reset_token = PasswordResetToken.create_for_user(user)
    api_client.post(VERIFY_RESET_CODE_URL, {"token": reset_token.token})

    reset_token.refresh_from_db()
    assert reset_token.used is False


@pytest.mark.django_db
def test_verify_reset_code_missing_token_returns_400(api_client):
    response = api_client.post(VERIFY_RESET_CODE_URL, {})

    assert response.status_code == 400


# ---------------------------------------------------------------------------
# POST /api/auth/reset-password/
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_reset_password_success(api_client, user):
    reset_token = PasswordResetToken.create_for_user(user)
    new_password = "NewStr0ngPass!"

    response = api_client.post(
        RESET_PASSWORD_URL, {"token": reset_token.token, "password": new_password}
    )

    assert response.status_code == 200
    user.refresh_from_db()
    assert user.check_password(new_password)


@pytest.mark.django_db
def test_reset_password_marks_token_used(api_client, user):
    reset_token = PasswordResetToken.create_for_user(user)

    api_client.post(
        RESET_PASSWORD_URL, {"token": reset_token.token, "password": "NewStr0ngPass!"}
    )

    reset_token.refresh_from_db()
    assert reset_token.used is True


@pytest.mark.django_db
def test_reset_password_invalid_token_returns_400(api_client):
    response = api_client.post(
        RESET_PASSWORD_URL, {"token": "not-a-real-token", "password": "NewStr0ngPass!"}
    )

    assert response.status_code == 400
    assert "token" in response.data


@pytest.mark.django_db
def test_reset_password_used_token_returns_400(api_client, user):
    reset_token = PasswordResetToken.create_for_user(user)
    reset_token.used = True
    reset_token.save()

    response = api_client.post(
        RESET_PASSWORD_URL, {"token": reset_token.token, "password": "NewStr0ngPass!"}
    )

    assert response.status_code == 400
    assert "token" in response.data


@pytest.mark.django_db
def test_reset_password_expired_token_returns_400(api_client, user):
    reset_token = PasswordResetToken.create_for_user(user)
    reset_token.expires_at = timezone.now() - timedelta(seconds=1)
    reset_token.save()

    response = api_client.post(
        RESET_PASSWORD_URL, {"token": reset_token.token, "password": "NewStr0ngPass!"}
    )

    assert response.status_code == 400
    assert "token" in response.data


@pytest.mark.django_db
def test_reset_password_weak_password_returns_400(api_client, user):
    reset_token = PasswordResetToken.create_for_user(user)

    response = api_client.post(
        RESET_PASSWORD_URL, {"token": reset_token.token, "password": "123"}
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_reset_password_missing_fields_returns_400(api_client):
    response = api_client.post(RESET_PASSWORD_URL, {})

    assert response.status_code == 400


@pytest.mark.django_db
def test_reset_password_blacklists_existing_sessions(api_client, user):
    from rest_framework_simplejwt.tokens import RefreshToken
    from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

    # Issue a refresh token to simulate an attacker session
    refresh = RefreshToken.for_user(user)
    jti = refresh["jti"]

    reset_token = PasswordResetToken.create_for_user(user)
    response = api_client.post(
        RESET_PASSWORD_URL, {"token": reset_token.token, "password": "NewStr0ngPass!"}
    )

    assert response.status_code == 200
    outstanding = OutstandingToken.objects.get(jti=jti)
    assert BlacklistedToken.objects.filter(token=outstanding).exists()

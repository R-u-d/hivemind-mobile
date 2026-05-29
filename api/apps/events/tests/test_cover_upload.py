from unittest.mock import MagicMock, patch

import pytest

from apps.communities.factories import CommunityFactory, MembershipFactory
from apps.communities.models import Membership

from ..factories import EventFactory


VALID_PAYLOAD = {"content_type": "image/jpeg", "file_size": 102400}


def cover_upload_url(event_pk):
    return f"/api/events/{event_pk}/cover-upload-url/"


@pytest.fixture(autouse=False)
def reset_s3_singleton():
    import core.s3
    core.s3._s3_client = None
    yield
    core.s3._s3_client = None


# ─── Auth / permission ────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_cover_upload_unauthenticated(api_client):
    event = EventFactory()
    response = api_client.post(cover_upload_url(event.id), VALID_PAYLOAD)
    assert response.status_code == 401


@pytest.mark.django_db
def test_cover_upload_non_member_forbidden(auth_client):
    client, _ = auth_client
    event = EventFactory()
    response = client.post(cover_upload_url(event.id), VALID_PAYLOAD)
    assert response.status_code == 403


@pytest.mark.django_db
def test_cover_upload_plain_member_forbidden(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.MEMBER)
    event = EventFactory(community=community)
    response = client.post(cover_upload_url(event.id), VALID_PAYLOAD)
    assert response.status_code == 403


# ─── Happy paths ──────────────────────────────────────────────────────────────

@pytest.mark.django_db
@patch("core.s3.boto3.client")
def test_cover_upload_organiser(mock_boto3_client, auth_client, reset_s3_singleton):
    mock_s3 = MagicMock()
    mock_boto3_client.return_value = mock_s3
    mock_s3.generate_presigned_url.return_value = "https://s3.amazonaws.com/fake-presigned"

    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.MEMBER)
    event = EventFactory(community=community, organiser=user)

    response = client.post(cover_upload_url(event.id), VALID_PAYLOAD)
    assert response.status_code == 200
    assert response.data["upload_url"] == "https://s3.amazonaws.com/fake-presigned"
    assert response.data["key"].startswith(f"event-covers/{event.id}/")
    assert "public_url" in response.data


@pytest.mark.django_db
@patch("core.s3.boto3.client")
def test_cover_upload_moderator(mock_boto3_client, auth_client, reset_s3_singleton):
    mock_s3 = MagicMock()
    mock_boto3_client.return_value = mock_s3
    mock_s3.generate_presigned_url.return_value = "https://s3.amazonaws.com/fake-presigned"

    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.MODERATOR)
    event = EventFactory(community=community)

    response = client.post(cover_upload_url(event.id), VALID_PAYLOAD)
    assert response.status_code == 200
    assert response.data["key"].startswith("event-covers/")


@pytest.mark.django_db
@patch("core.s3.boto3.client")
def test_cover_upload_owner(mock_boto3_client, auth_client, reset_s3_singleton):
    mock_s3 = MagicMock()
    mock_boto3_client.return_value = mock_s3
    mock_s3.generate_presigned_url.return_value = "https://s3.amazonaws.com/fake-presigned"

    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.OWNER)
    event = EventFactory(community=community)

    response = client.post(cover_upload_url(event.id), VALID_PAYLOAD)
    assert response.status_code == 200
    assert response.data["key"].startswith(f"event-covers/{event.id}/")


# ─── Validation ───────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_cover_upload_invalid_content_type(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.OWNER)
    event = EventFactory(community=community)
    response = client.post(cover_upload_url(event.id), {"content_type": "application/pdf", "file_size": 1024})
    assert response.status_code == 400


@pytest.mark.django_db
def test_cover_upload_file_too_large(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.OWNER)
    event = EventFactory(community=community)
    response = client.post(cover_upload_url(event.id), {"content_type": "image/jpeg", "file_size": 6 * 1024 * 1024})
    assert response.status_code == 400


@pytest.mark.django_db
def test_cover_upload_missing_fields(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(community=community, user=user, role=Membership.Role.OWNER)
    event = EventFactory(community=community)
    response = client.post(cover_upload_url(event.id), {})
    assert response.status_code == 400

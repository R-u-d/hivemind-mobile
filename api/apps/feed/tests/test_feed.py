from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.communities.factories import (
    ChannelFactory,
    CommunityFactory,
    MembershipFactory,
    PostFactory,
)
from apps.events.factories import EventFactory


FEED_URL = "/api/feed/"


def auth_client_for(user):
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return client


# ─── Auth ────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_feed_requires_authentication(api_client):
    response = api_client.get(FEED_URL)
    assert response.status_code == 401


# ─── Empty states ─────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_feed_empty_when_no_memberships(auth_client):
    client, _ = auth_client
    response = client.get(FEED_URL)
    assert response.status_code == 200
    assert response.data["results"] == []
    assert response.data["next"] is None


@pytest.mark.django_db
def test_feed_empty_when_communities_have_no_content(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(user=user, community=community)
    response = client.get(FEED_URL)
    assert response.status_code == 200
    assert response.data["results"] == []


# ─── Isolation ───────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_feed_excludes_non_member_community_posts(auth_client):
    client, _ = auth_client
    PostFactory()  # post in a community the user never joined
    response = client.get(FEED_URL)
    assert response.status_code == 200
    assert response.data["results"] == []


@pytest.mark.django_db
def test_feed_excludes_non_member_community_events(auth_client):
    client, _ = auth_client
    EventFactory()
    response = client.get(FEED_URL)
    assert response.status_code == 200
    assert response.data["results"] == []


# ─── Content inclusion ───────────────────────────────────────────────────────

@pytest.mark.django_db
def test_feed_includes_posts_from_joined_communities(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(user=user, community=community)
    channel = ChannelFactory(community=community)
    post = PostFactory(channel=channel)

    response = client.get(FEED_URL)
    assert response.status_code == 200
    assert len(response.data["results"]) == 1
    item = response.data["results"][0]
    assert item["type"] == "post"
    assert str(item["id"]) == str(post.id)


@pytest.mark.django_db
def test_feed_includes_events_from_joined_communities(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(user=user, community=community)
    event = EventFactory(community=community)

    response = client.get(FEED_URL)
    assert response.status_code == 200
    assert len(response.data["results"]) == 1
    item = response.data["results"][0]
    assert item["type"] == "event"
    assert str(item["id"]) == str(event.id)


@pytest.mark.django_db
def test_feed_type_discriminator_present(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(user=user, community=community)
    channel = ChannelFactory(community=community)
    PostFactory(channel=channel)
    EventFactory(community=community)

    response = client.get(FEED_URL)
    assert response.status_code == 200
    types = {item["type"] for item in response.data["results"]}
    assert types == {"post", "event"}


@pytest.mark.django_db
def test_feed_event_has_going_count(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(user=user, community=community)
    EventFactory(community=community)

    response = client.get(FEED_URL)
    event_item = next(i for i in response.data["results"] if i["type"] == "event")
    assert "going_count" in event_item
    assert event_item["going_count"] == 0
    assert "interested_count" in event_item
    assert event_item["interested_count"] == 0


# ─── Ordering ────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_feed_sorted_newest_first(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(user=user, community=community)
    channel = ChannelFactory(community=community)

    from apps.communities.models import Post
    from apps.events.models import Event as EventModel

    now = timezone.now()
    post_old = PostFactory(channel=channel)
    Post.objects.filter(pk=post_old.pk).update(created_at=now - timedelta(hours=3))

    event_mid = EventFactory(community=community)
    EventModel.objects.filter(pk=event_mid.pk).update(created_at=now - timedelta(hours=2))

    post_new = PostFactory(channel=channel)
    Post.objects.filter(pk=post_new.pk).update(created_at=now - timedelta(hours=1))

    response = client.get(FEED_URL)
    assert response.status_code == 200
    ids = [str(item["id"]) for item in response.data["results"]]
    assert ids == [str(post_new.id), str(event_mid.id), str(post_old.id)]


# ─── Cursor pagination ───────────────────────────────────────────────────────

@pytest.mark.django_db
def test_feed_cursor_pagination_no_overlap_no_gap(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(user=user, community=community)
    channel = ChannelFactory(community=community)

    from apps.communities.models import Post

    now = timezone.now()
    items = []
    for i in range(25):
        p = PostFactory(channel=channel)
        Post.objects.filter(pk=p.pk).update(created_at=now - timedelta(minutes=i))
        items.append(str(p.id))

    response1 = client.get(FEED_URL)
    assert response1.status_code == 200
    assert len(response1.data["results"]) == 20
    assert response1.data["next"] is not None

    next_url = response1.data["next"]
    cursor = next_url.split("cursor=")[1]
    response2 = client.get(FEED_URL, {"cursor": cursor})
    assert response2.status_code == 200
    assert len(response2.data["results"]) == 5
    assert response2.data["next"] is None

    page1_ids = {str(item["id"]) for item in response1.data["results"]}
    page2_ids = {str(item["id"]) for item in response2.data["results"]}
    assert page1_ids.isdisjoint(page2_ids)
    assert page1_ids | page2_ids == set(items)


@pytest.mark.django_db
def test_feed_invalid_cursor_returns_first_page(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(user=user, community=community)
    channel = ChannelFactory(community=community)
    PostFactory(channel=channel)

    response = client.get(FEED_URL, {"cursor": "notvalidbase64!!!"})
    assert response.status_code == 200
    assert len(response.data["results"]) == 1


@pytest.mark.django_db
def test_feed_no_next_when_results_fit_one_page(auth_client):
    client, user = auth_client
    community = CommunityFactory()
    MembershipFactory(user=user, community=community)
    channel = ChannelFactory(community=community)
    PostFactory.create_batch(5, channel=channel)

    response = client.get(FEED_URL)
    assert response.status_code == 200
    assert response.data["next"] is None

import pytest
from django.core.management import call_command

from apps.communities.factories import ChannelFactory, CommunityFactory, MembershipFactory
from apps.communities.models import Post
from users.factories import UserFactory


@pytest.mark.django_db
def test_seed_posts_never_repeats_a_body_within_a_channel():
    """A channel showing the same post twice is the clearest sign the data was
    generated. seed_posts must draw without replacement."""
    community = CommunityFactory()
    for _ in range(3):
        MembershipFactory(community=community, user=UserFactory())
    channels = [ChannelFactory(community=community, channel_type="general") for _ in range(5)]

    call_command("seed_posts", clear=True)

    for channel in channels:
        bodies = list(Post.objects.filter(channel=channel).values_list("body", flat=True))
        assert bodies, f"channel {channel.pk} got no posts"
        assert len(bodies) == len(set(bodies)), f"channel {channel.pk} has a duplicate body"


@pytest.mark.django_db
def test_seed_posts_varies_the_count_across_channels():
    """Identical post counts in every channel make every community look like a
    copy of the last one."""
    community = CommunityFactory()
    for _ in range(3):
        MembershipFactory(community=community, user=UserFactory())
    channels = [ChannelFactory(community=community, channel_type="general") for _ in range(12)]

    call_command("seed_posts", clear=True)

    counts = {Post.objects.filter(channel=c).count() for c in channels}
    assert len(counts) > 1, f"every channel got the same number of posts: {counts}"

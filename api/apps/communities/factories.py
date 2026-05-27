import factory

from users.factories import UserFactory

from .models import Channel, Community, Membership, Post


class CommunityFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Community

    name = factory.Sequence(lambda n: f"Community {n}")
    description = "A test community."
    community_type = Community.Type.SOCIAL
    owner = factory.SubFactory(UserFactory)
    cover_image_url = ""
    is_private = False


class MembershipFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Membership

    community = factory.SubFactory(CommunityFactory)
    user = factory.SubFactory(UserFactory)
    role = Membership.Role.MEMBER


class ChannelFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Channel

    community = factory.SubFactory(CommunityFactory)
    name = factory.Sequence(lambda n: f"channel-{n}")
    description = ""
    channel_type = Channel.ChannelType.GENERAL


class PostFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Post

    channel = factory.SubFactory(ChannelFactory)
    author = factory.SubFactory(UserFactory)
    body = factory.Sequence(lambda n: f"Post body {n}.")

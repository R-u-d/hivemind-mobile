import factory

from users.factories import UserFactory

from .models import Community


class CommunityFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Community

    name = factory.Sequence(lambda n: f"Community {n}")
    description = "A test community."
    community_type = Community.Type.SOCIAL
    owner = factory.SubFactory(UserFactory)
    cover_image_url = ""
    is_private = False

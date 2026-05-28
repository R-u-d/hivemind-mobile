import factory
from django.utils import timezone

from apps.communities.factories import CommunityFactory
from users.factories import UserFactory

from .models import Event


class EventFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Event

    community = factory.SubFactory(CommunityFactory)
    organiser = factory.SubFactory(UserFactory)
    title = factory.Sequence(lambda n: f"Event {n}")
    description = "A test event."
    location_text = "Test Location"
    lat = None
    lng = None
    start_datetime = factory.LazyFunction(lambda: timezone.now() + timezone.timedelta(days=1))
    end_datetime = factory.LazyFunction(lambda: timezone.now() + timezone.timedelta(days=1, hours=2))
    cover_image_url = ""
    capacity = None

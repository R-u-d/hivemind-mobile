import factory

from users.factories import UserFactory

from .models import Notification, PushToken


class PushTokenFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = PushToken

    user = factory.SubFactory(UserFactory)
    token = factory.Sequence(lambda n: f"ExponentPushToken[token-{n}]")
    platform = PushToken.Platform.IOS


class NotificationFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Notification

    recipient = factory.SubFactory(UserFactory)
    notification_type = Notification.Type.NEW_POST
    title = factory.Sequence(lambda n: f"Notification {n}")
    body = "A test notification."
    data = factory.LazyFunction(dict)

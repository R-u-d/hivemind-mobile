from unittest.mock import patch

import pytest

from apps.communities.factories import ChannelFactory, MembershipFactory, PostFactory
from apps.events.factories import EventFactory, RSVPFactory
from apps.events.models import RSVP
from apps.notifications.factories import NotificationFactory, PushTokenFactory
from apps.notifications.models import Notification
from apps.notifications.services import send_expo_push
from apps.notifications.tasks import dispatch_notification
from users.factories import UserFactory

pytestmark = pytest.mark.django_db


def test_dispatch_sends_to_registered_devices(mock_expo):
    notification = NotificationFactory()
    PushTokenFactory(user=notification.recipient, token="ExponentPushToken[t1]")
    dispatch_notification(str(notification.id))
    mock_expo.assert_called_once()
    messages = mock_expo.call_args[0][0]
    assert messages[0]["to"] == "ExponentPushToken[t1]"
    assert messages[0]["title"] == notification.title
    assert messages[0]["data"]["notification_id"] == str(notification.id)


def test_dispatch_without_tokens_sends_nothing(mock_expo):
    notification = NotificationFactory()
    dispatch_notification(str(notification.id))
    mock_expo.assert_not_called()


def test_dispatch_missing_notification_is_noop(mock_expo):
    dispatch_notification("00000000-0000-0000-0000-000000000000")
    mock_expo.assert_not_called()


def test_send_expo_push_posts_payload():
    messages = [{"to": "ExponentPushToken[x]", "title": "Hi", "body": "", "data": {}}]
    with patch("apps.notifications.services.urllib.request.urlopen") as mock_open:
        mock_open.return_value.__enter__.return_value.read.return_value = b'{"data": []}'
        result = send_expo_push(messages)
    assert result == {"data": []}
    request = mock_open.call_args[0][0]
    assert request.get_method() == "POST"


def test_new_post_notifies_other_members(mock_expo):
    channel = ChannelFactory()
    community = channel.community
    member = MembershipFactory(community=community).user
    author = MembershipFactory(community=community).user
    PostFactory(channel=channel, author=author)

    recipients = set(Notification.objects.values_list("recipient_id", flat=True))
    assert member.id in recipients
    assert author.id not in recipients
    assert Notification.objects.filter(
        notification_type=Notification.Type.NEW_POST
    ).exists()


def test_new_event_notifies_members(mock_expo):
    membership = MembershipFactory()
    community = membership.community
    member = membership.user
    EventFactory(community=community, organiser=UserFactory())

    notes = Notification.objects.filter(
        recipient=member, notification_type=Notification.Type.NEW_EVENT
    )
    assert notes.count() == 1


def test_rsvp_notifies_organiser(mock_expo):
    event = EventFactory()
    attendee = UserFactory()
    RSVPFactory(event=event, user=attendee, status=RSVP.Status.GOING)

    notes = Notification.objects.filter(
        recipient=event.organiser, notification_type=Notification.Type.RSVP
    )
    assert notes.count() == 1


def test_rsvp_to_own_event_does_not_notify(mock_expo):
    event = EventFactory()
    RSVPFactory(event=event, user=event.organiser, status=RSVP.Status.GOING)

    notes = Notification.objects.filter(notification_type=Notification.Type.RSVP)
    assert notes.count() == 0

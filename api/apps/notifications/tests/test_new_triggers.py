"""Tests for member-join signal, digest throttle, and day-before event reminder."""
import pytest
from django.utils import timezone
from datetime import timedelta

from apps.communities.factories import CommunityFactory, MembershipFactory
from apps.events.factories import EventFactory, RSVPFactory
from apps.events.models import RSVP
from apps.notifications.models import Notification
from apps.notifications.tasks import send_event_reminders
from users.factories import UserFactory

pytestmark = pytest.mark.django_db


# ─── Member-join signal ───────────────────────────────────────────────────────

def test_member_join_notifies_owner(mock_expo):
    community = CommunityFactory()
    owner = community.owner
    MembershipFactory(community=community, user=owner, role="owner")
    joiner = UserFactory()
    MembershipFactory(community=community, user=joiner, role="member")

    notes = Notification.objects.filter(
        recipient=owner, notification_type=Notification.Type.MEMBER_JOIN
    )
    assert notes.count() == 1
    assert joiner.display_name in notes.first().title


def test_member_join_notifies_moderators(mock_expo):
    community = CommunityFactory()
    MembershipFactory(community=community, user=community.owner, role="owner")
    mod = UserFactory()
    MembershipFactory(community=community, user=mod, role="moderator")
    joiner = UserFactory()
    MembershipFactory(community=community, user=joiner, role="member")

    recipients = set(
        Notification.objects.filter(
            notification_type=Notification.Type.MEMBER_JOIN
        ).values_list("recipient_id", flat=True)
    )
    assert community.owner.id in recipients
    assert mod.id in recipients
    assert joiner.id not in recipients


def test_owner_membership_does_not_trigger_notify(mock_expo):
    # Creating a community auto-creates an owner Membership — should not self-notify.
    community = CommunityFactory()
    assert not Notification.objects.filter(
        notification_type=Notification.Type.MEMBER_JOIN,
        recipient=community.owner,
    ).exists()


def test_role_update_does_not_trigger_notify(mock_expo):
    community = CommunityFactory()
    membership = MembershipFactory(community=community, role="member")
    Notification.objects.all().delete()  # clear join notification
    membership.role = "moderator"
    membership.save()

    assert not Notification.objects.filter(
        notification_type=Notification.Type.MEMBER_JOIN
    ).exists()


# ─── Digest throttle ─────────────────────────────────────────────────────────

def test_first_post_sends_push(mock_expo):
    from apps.communities.factories import ChannelFactory, PostFactory
    from apps.notifications.factories import PushTokenFactory

    channel = ChannelFactory()
    member = MembershipFactory(community=channel.community).user
    PushTokenFactory(user=member)
    author = MembershipFactory(community=channel.community).user

    PostFactory(channel=channel, author=author)

    mock_expo.assert_called_once()


def test_second_post_creates_notification_but_no_push(mock_expo):
    from apps.communities.factories import ChannelFactory, PostFactory

    channel = ChannelFactory()
    member = MembershipFactory(community=channel.community).user
    author = MembershipFactory(community=channel.community).user

    PostFactory(channel=channel, author=author)
    mock_expo.reset_mock()
    PostFactory(channel=channel, author=author)

    # In-app row still created for second post
    assert Notification.objects.filter(
        notification_type=Notification.Type.NEW_POST,
        recipient=member,
    ).count() == 2
    # But no push dispatched for the second post
    mock_expo.assert_not_called()


# ─── Day-before event reminder ────────────────────────────────────────────────

def test_reminder_sent_for_going_rsvp(mock_expo):
    event = EventFactory(
        start_datetime=timezone.now() + timedelta(hours=24),
        end_datetime=timezone.now() + timedelta(hours=26),
    )
    attendee = UserFactory()
    RSVPFactory(event=event, user=attendee, status=RSVP.Status.GOING)

    send_event_reminders()

    assert Notification.objects.filter(
        recipient=attendee,
        notification_type=Notification.Type.EVENT_REMINDER,
    ).exists()


def test_reminder_not_sent_for_interested_rsvp(mock_expo):
    event = EventFactory(
        start_datetime=timezone.now() + timedelta(hours=24),
        end_datetime=timezone.now() + timedelta(hours=26),
    )
    attendee = UserFactory()
    RSVPFactory(event=event, user=attendee, status=RSVP.Status.INTERESTED)

    send_event_reminders()

    assert not Notification.objects.filter(
        notification_type=Notification.Type.EVENT_REMINDER
    ).exists()


def test_reminder_not_sent_outside_window(mock_expo):
    # Event in 3 days — outside the 20–28h window
    event = EventFactory(
        start_datetime=timezone.now() + timedelta(hours=72),
        end_datetime=timezone.now() + timedelta(hours=74),
    )
    attendee = UserFactory()
    RSVPFactory(event=event, user=attendee, status=RSVP.Status.GOING)

    send_event_reminders()

    assert not Notification.objects.filter(
        notification_type=Notification.Type.EVENT_REMINDER
    ).exists()


def test_reminder_dedup_prevents_double_fire(mock_expo):
    event = EventFactory(
        start_datetime=timezone.now() + timedelta(hours=24),
        end_datetime=timezone.now() + timedelta(hours=26),
    )
    attendee = UserFactory()
    RSVPFactory(event=event, user=attendee, status=RSVP.Status.GOING)

    send_event_reminders()
    send_event_reminders()

    assert Notification.objects.filter(
        recipient=attendee,
        notification_type=Notification.Type.EVENT_REMINDER,
    ).count() == 1

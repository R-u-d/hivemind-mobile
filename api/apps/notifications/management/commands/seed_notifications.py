from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from apps.communities.models import Channel, Membership, Post
from apps.events.models import Event
from apps.notifications.models import Notification

User = get_user_model()


class Command(BaseCommand):
    help = "Seed fake notifications for a user using content from their joined communities."

    def add_arguments(self, parser):
        parser.add_argument("--email", type=str, help="Email of the user to seed for")
        parser.add_argument("--clear", action="store_true", help="Delete existing notifications first")
        parser.add_argument("--clear-only", action="store_true", help="Delete notifications without creating new ones")

    def handle(self, *args, **options):
        email = options.get("email")

        if email:
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                raise CommandError(f"No user found with email: {email}")
        else:
            user = User.objects.order_by("created_at").first()
            if not user:
                raise CommandError("No users in the database.")

        if options.get("clear") or options.get("clear_only"):
            deleted, _ = Notification.objects.filter(recipient=user).delete()
            self.stdout.write(f"  Deleted {deleted} existing notifications for {user.email}")

        if options.get("clear_only"):
            return

        # Use content from communities the user is a member of so navigation works.
        joined_community_ids = list(
            Membership.objects.filter(user=user).values_list("community_id", flat=True)
        )

        # Pick a channel that has actual posts in it so the link lands on real content.
        post = (
            Post.objects.select_related("channel__community")
            .filter(channel__community_id__in=joined_community_ids)
            .first()
        )
        channel = post.channel if post else (
            Channel.objects.select_related("community")
            .filter(community_id__in=joined_community_ids)
            .first()
        )
        event = Event.objects.filter(community_id__in=joined_community_ids).first()

        if not channel and not event:
            raise CommandError(
                f"{user.email} is not a member of any community with content. "
                "Join a community first, then re-run this command."
            )

        samples = self._build_samples(user, channel, event, post)
        created = sum(1 for s in samples if Notification.objects.create(recipient=user, **s))

        self.stdout.write(self.style.SUCCESS(f"  Created {created} notifications for {user.email}"))

    def _build_samples(self, user, channel, event, post=None):
        channel_data = (
            {"community_id": str(channel.community_id), "channel_id": str(channel.id)}
            if channel else {}
        )
        event_data = {"event_id": str(event.id)} if event else {}
        community_data = {"community_id": str(channel.community_id)} if channel else (
            {"community_id": str(event.community_id)} if event else {}
        )
        community_name = channel.community.name if channel else (event.community.name if event else "your community")
        event_title = event.title if event else "an upcoming event"

        return [
            {
                "notification_type": Notification.Type.NEW_POST,
                "title": f"New post in {community_name}",
                "body": post.body[:140] if post else "Check out the latest discussion.",
                "data": channel_data,
                "is_read": False,
            },
            {
                "notification_type": Notification.Type.NEW_EVENT,
                "title": f"New event: {event_title}",
                "body": event.description[:140] if event and event.description else "",
                "data": {**community_data, **event_data},
                "is_read": False,
            },
            {
                "notification_type": Notification.Type.RSVP,
                "title": f"Someone is going to {event_title}",
                "body": "",
                "data": event_data,
                "is_read": False,
            },
            {
                "notification_type": Notification.Type.MEMBER_JOIN,
                "title": f"A new member joined {community_name}",
                "body": "",
                "data": community_data,
                "is_read": False,
            },
            {
                "notification_type": Notification.Type.EVENT_REMINDER,
                "title": f"Reminder: {event_title} is tomorrow",
                "body": (event.location_text or "") if event else "",
                "data": event_data,
                "is_read": True,
            },
            {
                "notification_type": Notification.Type.NEW_POST,
                "title": f"New post in {community_name}",
                "body": "Final details are up — check the announcements channel.",
                "data": channel_data,
                "is_read": True,
            },
        ]

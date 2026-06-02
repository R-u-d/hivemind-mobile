from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()


class Command(BaseCommand):
    help = "Wipe all seeded/test data, keeping a single user by email."

    def add_arguments(self, parser):
        parser.add_argument(
            "--keep",
            type=str,
            required=True,
            help="Email address of the user to keep.",
        )
        parser.add_argument(
            "--yes",
            action="store_true",
            help="Skip confirmation prompt.",
        )

    def handle(self, *args, **options):
        keep_email = options["keep"]

        keep_user = User.objects.filter(email=keep_email).first()
        if not keep_user:
            self.stdout.write(self.style.ERROR(f"User '{keep_email}' not found. Aborting."))
            return

        if not options["yes"]:
            confirm = input(
                f"\nThis will DELETE everything except '{keep_email}'. Type YES to continue: "
            )
            if confirm.strip() != "YES":
                self.stdout.write("Aborted.")
                return

        # Import here to avoid circular imports at module load
        from apps.communities.models import Community, Post, Channel, Membership
        from apps.events.models import Event, RSVP
        from apps.notifications.models import Notification
        from rest_framework_simplejwt.token_blacklist.models import (
            BlacklistedToken, OutstandingToken,
        )

        counts = {}

        counts["RSVPs"],           _ = RSVP.objects.all().delete()
        counts["Events"],          _ = Event.objects.all().delete()
        counts["Posts"],           _ = Post.objects.all().delete()
        counts["Channels"],        _ = Channel.objects.all().delete()
        counts["Memberships"],     _ = Membership.objects.all().delete()
        counts["Communities"],     _ = Community.objects.all().delete()
        counts["Notifications"],   _ = Notification.objects.all().delete()
        counts["JWT tokens"],      _ = OutstandingToken.objects.exclude(user=keep_user).delete()
        counts["Blacklist tokens"],_ = BlacklistedToken.objects.all().delete()
        counts["Users deleted"],   _ = User.objects.exclude(email=keep_email).delete()

        self.stdout.write("")
        for label, n in counts.items():
            if n:
                self.stdout.write(self.style.WARNING(f"  deleted {n:>6}  {label}"))

        self.stdout.write(self.style.SUCCESS(f"\nDone. Kept user: {keep_email}"))

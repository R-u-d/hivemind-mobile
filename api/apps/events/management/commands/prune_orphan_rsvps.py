from django.core.management.base import BaseCommand
from django.db.models import F

from apps.events.models import RSVP


class Command(BaseCommand):
    help = (
        "Delete orphan RSVPs — RSVPs to an event whose community the user "
        "neither belongs to nor organises. These can linger from before events "
        "were member-gated; they hold capacity slots and inflate the profile "
        "counter while being invisible in the (filtered) My Events list. "
        "Safe to re-run. Pass --dry-run to preview without deleting."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="List the orphan RSVPs that would be deleted without deleting them.",
        )
        parser.add_argument(
            "--email",
            default=None,
            help="Only prune orphan RSVPs belonging to this user's email "
            "(e.g. a single test account), leaving seed/demo data untouched.",
        )

    def handle(self, *args, **options):
        # An RSVP is valid when the user organises the event OR is a member of
        # the event's community. Orphans are everything else.
        orphans = (
            RSVP.objects.select_related("event", "event__community", "user")
            .exclude(event__organiser=F("user"))
            .exclude(event__community__memberships__user=F("user"))
        )

        if options["email"]:
            orphans = orphans.filter(user__email=options["email"])

        count = orphans.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS("No orphan RSVPs found."))
            return

        for rsvp in orphans:
            self.stdout.write(
                f'  - {rsvp.user.email} -> "{rsvp.event.title}" '
                f"({rsvp.event.community.name}) [{rsvp.status}]"
            )

        if options["dry_run"]:
            self.stdout.write(
                self.style.WARNING(f"Dry run — {count} orphan RSVP(s) would be deleted.")
            )
            return

        deleted, _ = orphans.delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {deleted} orphan RSVP(s)."))

from django.core.management.base import BaseCommand

from apps.communities.models import Channel, Community

# Channels seeded per community type.
# All types always get "general" + "announcements".
# Additional channels are type-specific.
CHANNELS_BY_TYPE = {
    "study": [
        {"name": "general", "type": "general", "description": "General discussion."},
        {"name": "announcements", "type": "announcements", "description": "Important updates."},
        {"name": "resources", "type": "media", "description": "Links, notes, and study materials."},
        {"name": "help", "type": "help", "description": "Ask questions, get answers."},
    ],
    "gaming": [
        {"name": "general", "type": "general", "description": "General chat."},
        {"name": "announcements", "type": "announcements", "description": "Important updates."},
        {"name": "looking-for-group", "type": "general", "description": "Find teammates."},
        {"name": "clips", "type": "media", "description": "Share your best moments."},
    ],
    "sports": [
        {"name": "general", "type": "general", "description": "General discussion."},
        {"name": "announcements", "type": "announcements", "description": "Schedules and updates."},
        {"name": "events", "type": "events", "description": "Upcoming meetups and sessions."},
        {"name": "results", "type": "general", "description": "Post scores and results."},
    ],
    "creative": [
        {"name": "general", "type": "general", "description": "General chat."},
        {"name": "announcements", "type": "announcements", "description": "Important updates."},
        {"name": "showcase", "type": "media", "description": "Share your work."},
        {"name": "feedback", "type": "help", "description": "Request and give constructive feedback."},
    ],
    "social": [
        {"name": "general", "type": "general", "description": "General conversation."},
        {"name": "announcements", "type": "announcements", "description": "Events and updates."},
        {"name": "events", "type": "events", "description": "Meetups and activities."},
        {"name": "off-topic", "type": "general", "description": "Anything goes."},
    ],
}


class Command(BaseCommand):
    help = "Seed channels into existing communities. Safe to re-run — skips existing channels."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all existing channels before seeding.",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            deleted, _ = Channel.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Deleted {deleted} channels."))

        communities = Community.objects.all()
        if not communities.exists():
            self.stdout.write(self.style.ERROR("No communities found. Run seed_communities first."))
            return

        created_total = 0
        skipped_total = 0

        for community in communities:
            channel_specs = CHANNELS_BY_TYPE.get(community.community_type, CHANNELS_BY_TYPE["social"])
            for spec in channel_specs:
                _, was_created = Channel.objects.get_or_create(
                    community=community,
                    name=spec["name"],
                    defaults={
                        "description": spec["description"],
                        "channel_type": spec["type"],
                    },
                )
                if was_created:
                    created_total += 1
                else:
                    skipped_total += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Created {created_total} channels"
                + (f", skipped {skipped_total} (already exist)." if skipped_total else ".")
            )
        )

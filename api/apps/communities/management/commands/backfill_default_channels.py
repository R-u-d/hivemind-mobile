from django.core.management.base import BaseCommand

from apps.communities.models import Channel, Community

# The 5 channels every community should have
DEFAULT_CHANNELS = [
    ("general",       Channel.ChannelType.GENERAL,       "General discussion."),
    ("announcements", Channel.ChannelType.ANNOUNCEMENTS, "Important updates."),
    ("events",        Channel.ChannelType.EVENTS,        "Upcoming events and meetups."),
    ("resources",     Channel.ChannelType.RESOURCES,     "Links and shared materials."),
    ("help",          Channel.ChannelType.HELP,          "Ask questions, get answers."),
]


class Command(BaseCommand):
    help = (
        "Ensure every community has all 5 default channels. "
        "Safe to re-run — only creates what is missing."
    )

    def handle(self, *args, **options):
        communities = Community.objects.all()
        if not communities.exists():
            self.stdout.write(self.style.ERROR("No communities found."))
            return

        created_total = 0
        skipped_total = 0

        for community in communities:
            for name, channel_type, description in DEFAULT_CHANNELS:
                _, was_created = Channel.objects.get_or_create(
                    community=community,
                    channel_type=channel_type,
                    defaults={"name": name, "description": description},
                )
                if was_created:
                    created_total += 1
                    self.stdout.write(f"  + {community.name} — #{name}")
                else:
                    skipped_total += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Created {created_total} channels"
                + (f", skipped {skipped_total} (already existed)." if skipped_total else ".")
            )
        )

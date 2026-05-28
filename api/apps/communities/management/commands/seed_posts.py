import random

from django.core.management.base import BaseCommand

from apps.communities.models import Channel, Membership, Post

# Sample posts per channel type
POSTS_BY_CHANNEL_TYPE = {
    "general": [
        "Hey everyone, glad to be here!",
        "Anyone active this weekend?",
        "Just wanted to introduce myself — looking forward to connecting.",
        "What's everyone been up to lately?",
        "Great community, really enjoying it so far.",
        "Has anyone tried the new update?",
        "Quick question — what's the best way to get started here?",
        "Long-time lurker, first time poster. Hi!",
        "This place is exactly what I was looking for.",
        "Any recommendations for beginners?",
    ],
    "announcements": [
        "Welcome to the community! Please read the rules in the pinned message.",
        "We've hit 100 members — thank you all for joining!",
        "Reminder: be respectful and constructive in all channels.",
        "New channels have been added — check them out!",
        "Maintenance scheduled for this weekend. Things may be slow.",
    ],
    "resources": [
        "Here's a great resource I found: highly recommend reading through it.",
        "Sharing my notes from last session — hope they help!",
        "Found this cheat sheet really useful for exam prep.",
        "Compiled a reading list for beginners — let me know if you want the link.",
        "Quick summary of the key concepts from this week.",
    ],
    "help": [
        "Can someone explain how this works? I'm a bit lost.",
        "Any tips for getting unstuck on this problem?",
        "I've been struggling with this for hours — any help appreciated!",
        "Is there a guide or FAQ somewhere?",
        "Thanks to everyone who helped last time — you're all legends.",
    ],
    "looking-for-group": [
        "Looking for 2 more for ranked — DM me.",
        "Anyone down for a casual session tonight?",
        "Need a team for the weekend tournament. All skill levels welcome.",
        "Forming a group for the new season — reply if interested.",
        "Running a scrimmage Sunday afternoon, spots available.",
    ],
    "clips": [
        "Finally got that clip I've been chasing for weeks!",
        "Check out this insane play from last night's session.",
        "Not my best game but this moment was too good not to share.",
        "Highlight reel from the weekend — what do you think?",
        "Drop your best clips below, let's see them!",
    ],
    "events": [
        "Event this Saturday — who's coming?",
        "Last call for sign-ups before the cutoff.",
        "Recap from last week's meetup — it was amazing!",
        "Next session is confirmed. Details in the pinned post.",
        "Anyone need a ride to the venue?",
    ],
    "results": [
        "We won! Great effort from everyone today.",
        "Tough match but we gave it everything.",
        "Final score posted — check the board.",
        "MVP of the week goes to an incredible performance.",
        "Close one today — we'll get them next time.",
    ],
    "showcase": [
        "Just finished this piece — feedback welcome!",
        "Been working on this for weeks, finally happy with it.",
        "Sharing a work-in-progress — still lots to do but excited about the direction.",
        "First time sharing here, be gentle! 😅",
        "Updated version based on the feedback — much better now.",
    ],
    "feedback": [
        "Would love some thoughts on my latest piece.",
        "Constructive criticism welcome — I want to improve.",
        "What do you think of the composition here?",
        "Any suggestions for the colour palette?",
        "Honest opinions only — what works, what doesn't?",
    ],
    "off-topic": [
        "Anyone else obsessed with this show right now?",
        "Hot take: pineapple belongs on pizza.",
        "Just had the best coffee of my life.",
        "Random thought: why do we say we 'catch' a bus when we can't throw it back?",
        "Who else is struggling with the weather lately?",
    ],
}

POSTS_PER_CHANNEL = 8


class Command(BaseCommand):
    help = "Seed sample posts into all seeded channels. Safe to re-run — adds posts each time (use --clear to reset)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all existing posts before seeding.",
        )
        parser.add_argument(
            "--count",
            type=int,
            default=POSTS_PER_CHANNEL,
            help=f"Number of posts per channel (default: {POSTS_PER_CHANNEL}).",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            deleted, _ = Post.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Deleted {deleted} posts."))

        channels = Channel.objects.select_related("community").all()
        if not channels.exists():
            self.stdout.write(self.style.ERROR("No channels found. Run seed_channels first."))
            return

        count_per_channel = options["count"]
        created_total = 0

        for channel in channels:
            # Get members of this community as potential authors
            member_ids = list(
                Membership.objects.filter(community=channel.community).values_list("user_id", flat=True)
            )
            if not member_ids:
                continue

            pool = POSTS_BY_CHANNEL_TYPE.get(channel.channel_type, POSTS_BY_CHANNEL_TYPE["general"])
            # Cycle through pool if count > pool size
            bodies = [pool[i % len(pool)] for i in range(count_per_channel)]

            for body in bodies:
                Post.objects.create(
                    channel=channel,
                    author_id=random.choice(member_ids),
                    body=body,
                )
                created_total += 1

        self.stdout.write(self.style.SUCCESS(f"Done. Created {created_total} posts across {channels.count()} channels."))

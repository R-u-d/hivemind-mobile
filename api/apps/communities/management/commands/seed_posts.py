import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models.signals import post_save
from django.utils import timezone

from apps.communities.models import Channel, Membership, Post

# Posts grouped by channel type, with varied lengths.
# Tuples: (body, length_hint) where length_hint is just a label for organisation.
POSTS_BY_CHANNEL_TYPE = {
    "general": [
        # 1-liners
        "Hey everyone, glad to be here!",
        "Anyone active this weekend?",
        "Long-time lurker, first time poster. Hi!",
        "This place is exactly what I was looking for.",
        "Quick question — what's the best way to get started here?",
        # 2-liners
        "Just wanted to introduce myself — looking forward to connecting with everyone here. "
        "Feel free to DM if you want to chat.",
        "Has anyone tried the new update? I noticed a few things changed and wanted to hear "
        "what others think about it.",
        "Great community, really enjoying it so far. The energy here is different from most places "
        "I've joined — actually feels like people care.",
        # 3–4 liners
        "What's everyone been up to lately? I've been pretty heads-down with work but trying to "
        "get more involved here again. Would love to catch up and hear what's been going on "
        "with the group.",
        "Any recommendations for beginners? I'm fairly new to all of this and finding it "
        "a bit overwhelming at times. Even just knowing where to start would help a lot — "
        "appreciate any pointers you can offer.",
        # 5+ liners
        "I just wanted to take a second to say thank you to everyone who made last week's session "
        "so good. I was a bit nervous coming in as a newcomer but you all made me feel genuinely "
        "welcome. It's rare to find a group that's both knowledgeable and kind. Already looking "
        "forward to the next one — and if anyone wants to grab a coffee beforehand and talk "
        "through some ideas, I'm totally down for that.",
    ],
    "announcements": [
        # 1-liner
        "Reminder: be respectful and constructive in all channels.",
        # 2-liner
        "Welcome to the community! Please read the rules in the pinned message before posting — "
        "it'll save everyone time.",
        # 3-liner
        "We've hit 100 members — thank you all for joining! This community has grown faster than "
        "we expected and the quality of conversations has been genuinely impressive. Here's to "
        "the next 100.",
        # 4-liner
        "New channels have been added — check them out and find where you fit best. We've tried "
        "to keep things organised so the right conversations happen in the right places. If you "
        "think something's missing, drop a suggestion in #general and we'll consider it. "
        "Thanks for helping shape this space.",
        # 5-liner
        "Maintenance is scheduled for this weekend — things may be slow or unavailable for a "
        "few hours on Saturday afternoon. We'll post an update when everything is back to normal. "
        "In the meantime, please avoid posting anything time-sensitive. Apologies for the "
        "inconvenience and thanks for your patience. This is necessary to keep things running "
        "smoothly going forward.",
    ],
    "resources": [
        # 1-liner
        "Found this cheat sheet really useful for exam prep.",
        # 2-liner
        "Here's a great resource I found — highly recommend reading through it before the next "
        "session. It covers the core concepts clearly.",
        # 3-liner
        "Sharing my notes from last session — hope they help! I tried to capture the key points "
        "as accurately as possible but let me know if anything looks off. Happy to clarify "
        "anything in the comments.",
        # 5-liner
        "Compiled a reading list for absolute beginners — let me know if you want the link. "
        "It's a mix of free articles, a couple of YouTube playlists, and one paid book that's "
        "genuinely worth it. I've tried to order it so you build up knowledge gradually rather "
        "than getting overwhelmed early. The whole thing takes about 3 weeks if you do an hour "
        "a day — manageable even if you're busy.",
    ],
    "help": [
        # 1-liner
        "Is there a guide or FAQ somewhere?",
        # 2-liner
        "Can someone explain how this works? I've read the docs twice and still feel like I'm "
        "missing something fundamental.",
        # 3-liner
        "Any tips for getting unstuck on this problem? I've been going in circles for a couple "
        "of hours now. Pretty sure it's something obvious I'm overlooking but I can't spot it "
        "from where I'm standing.",
        # 4-liner
        "I've been struggling with this for hours — any help appreciated! I've tried the obvious "
        "approaches and searched online but the answers I find either don't apply or assume "
        "knowledge I don't have yet. If anyone has 5 minutes to look over what I've got so far, "
        "I'd be genuinely grateful.",
        # 5-liner
        "Thanks to everyone who helped last time — you're all legends. The fix worked perfectly "
        "and I actually understand why now, which is the more important part. I wrote it up in "
        "a short doc in case anyone else runs into the same issue — happy to share it here if "
        "that's useful. It covers the exact steps plus a couple of edge cases I found along the "
        "way. Let me know and I'll post it in the resources channel.",
    ],
    "looking-for-group": [
        "Looking for 2 more for ranked — DM me.",
        "Anyone down for a casual session tonight?",
        "Need a team for the weekend tournament. All skill levels welcome.",
        "Forming a group for the new season — reply if interested. We're aiming for Diamond "
        "by end of month. Ideally looking for people who can commit to 3 sessions a week.",
        "Running a scrimmage Sunday afternoon, spots available. We'll warm up for an hour then "
        "do structured 5v5. Focus on comms and coordination more than results. Good for players "
        "who want to improve their team play rather than just carry.",
    ],
    "clips": [
        "Finally got that clip I've been chasing for weeks!",
        "Check out this insane play from last night's session.",
        "Not my best game but this moment was too good not to share.",
        "Highlight reel from the weekend — what do you think? I put it together quickly so the "
        "editing isn't polished but the plays speak for themselves.",
        "Drop your best clips below, let's see them! I'll compile the top ones into a monthly "
        "reel if we get enough good submissions. No pressure, just for fun.",
    ],
    "events": [
        "Event this Saturday — who's coming?",
        "Last call for sign-ups before the cutoff.",
        "Recap from last week's meetup — it was amazing! Turnout was better than expected and "
        "the venue worked really well. Already thinking about the next one.",
        "Next session is confirmed. Details in the pinned post.",
        "Anyone need a ride to the venue? I'm driving from Mitte and have two spare seats — "
        "reply here or DM me with your location and I'll see if it's on the way.",
    ],
    "results": [
        "We won! Great effort from everyone today.",
        "Tough match but we gave it everything.",
        "Final score posted — check the board.",
        "MVP of the week goes to an incredible performance.",
        "Close one today — we'll get them next time. Honestly could have gone either way. "
        "We were stronger in the second half but left it a bit late.",
    ],
    "showcase": [
        "Just finished this piece — feedback welcome!",
        "Been working on this for weeks, finally happy with it.",
        "Sharing a work-in-progress — still lots to do but excited about the direction.",
        "First time sharing here, be gentle! Spent about 12 hours on this across the last two "
        "weeks. Still learning but I think the fundamentals are starting to click.",
        "Updated version based on the feedback from last time — much better now. I reworked "
        "the composition entirely and it made a big difference. Thank you to everyone who took "
        "the time to comment — it genuinely helped. Happy to return the favour if anyone wants "
        "an extra set of eyes on their work.",
    ],
    "feedback": [
        "Would love some thoughts on my latest piece.",
        "Constructive criticism welcome — I want to improve.",
        "What do you think of the composition here? I keep second-guessing the focal point "
        "and would value an outside perspective.",
        "Any suggestions for the colour palette? I've gone back and forth on this and now I "
        "can't see it clearly any more. Sometimes you just need fresh eyes. Honest opinions "
        "only — what works, what doesn't, and what you'd change if it were yours.",
    ],
    "off-topic": [
        "Anyone else obsessed with this show right now?",
        "Hot take: pineapple belongs on pizza.",
        "Just had the best coffee of my life.",
        "Random thought: why do we say we 'catch' a bus when we can't throw it back?",
        "Who else is struggling with the weather lately? It's been relentless. I've started "
        "just accepting it as a personality trait of this city and dressing accordingly.",
        "I started reading again after about two years of not finishing a single book and "
        "I forgot how good it feels. Turns out the problem was I was reading the wrong things. "
        "If anyone has recommendations for genuinely gripping fiction — nothing too dense — "
        "I'm all ears. Just finished one in three days which felt like a small personal miracle.",
    ],
}

POSTS_PER_CHANNEL = 10
# Posts spread across this many days in the past
SPREAD_DAYS = 28


class Command(BaseCommand):
    help = "Seed sample posts with varied lengths and spread-out timestamps. Safe to re-run with --clear."

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
        # Disconnect notification signals — seed runs without Redis/Celery
        from apps.notifications.signals import notify_new_post
        post_save.disconnect(notify_new_post, sender=Post)

        try:
            self._seed(options)
        finally:
            post_save.connect(notify_new_post, sender=Post)

    def _seed(self, options):
        if options["clear"]:
            deleted, _ = Post.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Deleted {deleted} posts."))

        channels = Channel.objects.select_related("community").all()
        if not channels.exists():
            self.stdout.write(self.style.ERROR("No channels found. Run seed_channels first."))
            return

        count_per_channel = options["count"]
        now = timezone.now()
        created_total = 0

        for channel in channels:
            member_ids = list(
                Membership.objects.filter(community=channel.community).values_list("user_id", flat=True)
            )
            if not member_ids:
                continue

            pool = POSTS_BY_CHANNEL_TYPE.get(channel.channel_type, POSTS_BY_CHANNEL_TYPE["general"])
            bodies = [pool[i % len(pool)] for i in range(count_per_channel)]

            for i, body in enumerate(bodies):
                post = Post.objects.create(
                    channel=channel,
                    author_id=random.choice(member_ids),
                    body=body,
                )
                # Spread created_at uniformly across the last SPREAD_DAYS days so that
                # posts from different channels are interleaved in the feed.
                minutes_ago = random.uniform(60, SPREAD_DAYS * 24 * 60)
                Post.objects.filter(pk=post.pk).update(
                    created_at=now - timedelta(minutes=minutes_ago)
                )
                created_total += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Created {created_total} posts across {channels.count()} channels "
                f"with timestamps spread over the last {SPREAD_DAYS} days."
            )
        )

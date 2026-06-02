import random
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db.models.signals import post_save
from django.utils import timezone

from apps.communities.models import Community
from apps.events.models import Event, RSVP

User = get_user_model()

# Fields: (community_name, title, description, location_text,
#          start_offset_days, duration_hours, capacity, created_at_days_ago)
#
# start_offset_days: days from now when the event starts (+future, -past)
# created_at_days_ago: how many days ago the event was "posted" to the community
SEED_EVENTS = [
    # ── Far past (5–8 weeks ago) ──────────────────────────────────────────────
    ("CS Study Group",     "Intro to Algorithms",           "Sorting, searching, and Big-O basics. Great for beginners.", "Online — Zoom",                           -56, 2,  50,  60),
    ("Morning Runners",    "January 5K Time Trial",         "Monthly timed 5K — all paces, chip timing.",                 "Tiergarten, Berlin",                      -52, 1,  None, 56),
    ("Gym Accountability", "New Year PR Challenge",         "Log your baseline lifts for the year ahead.",                "Kraftwerk Gym, Berlin",                   -49, 2,  None, 53),
    ("Photography Club",   "Winter Light Walk",             "Capture the low winter sun. All cameras welcome.",           "Museumsinsel, Berlin",                    -45, 2,  None, 48),
    ("Board Game Nights",  "Pandemic Co-op Night",          "Full Pandemic campaign — can we save the world?",            "Café Morgenrot, Berlin",                  -42, 4,  8,   46),
    ("Valorant Squad",     "Spring Season Kickoff",         "Ranked queue to start the new season strong.",               "Online — Discord",                        -40, 3,  None, 43),
    ("Foodies Unite",      "Prenzlauer Berg Brunch Tour",   "Exploring the best brunch spots north of the ring.",         "Prenzlauer Berg, Berlin",                 -38, 3,  None, 41),

    # ── Mid past (2–4 weeks ago) ──────────────────────────────────────────────
    ("Football Pickup",    "Saturday 5-a-side",             "Casual pickup — bring boots and water.",                     "Tempelhof Field, Berlin",                 -28, 2,  None, 30),
    ("CS Study Group",     "Algorithms Workshop",           "Big-O, sorting, and graph traversal deep dive.",             "Online — Zoom",                           -25, 3,  50,  27),
    ("Board Game Nights",  "Settlers of Catan Night",       "6-player Catan marathon. Bring snacks.",                     "Café Morgenrot, Berlin",                  -21, 4,  12,  24),
    ("Digital Artists",    "UI Design Critique",            "Bring your screens and get honest feedback.",                 "Co.up, Adalbertstr. 8, Berlin",           -19, 2,  20,  22),
    ("Math Nerds",         "Calculus Review Session",       "Limits, derivatives, and integrals — back to basics.",       "Online — Zoom",                           -18, 2,  None, 21),
    ("Language Exchange",  "German–English Swap",           "Pair up with a native speaker. All levels welcome.",         "Einstein Café, Berlin",                   -16, 2,  None, 19),
    ("Songwriters",        "First Verse Workshop",          "Bring an unfinished song — leave with a first verse.",       "Privatclub, Berlin",                      -14, 3,  15,  17),
    ("Retro Gamers",       "SNES Night",                    "Super Mario Kart tournament. Bring your controller.",        "Player One Bar, Berlin",                  -12, 4,  16,  15),

    # ── Recent past (last week) ───────────────────────────────────────────────
    ("Photography Club",   "Golden Hour Walk",              "Street photography at dusk. All cameras welcome.",           "Hackescher Markt, Berlin",                -7,  2,  None, 10),
    ("Gym Accountability", "Wednesday Form Check",          "Coaches on hand to review your squat and deadlift.",         "Kraftwerk Gym, Berlin",                   -6,  2,  None, 9),
    ("Indie Game Devs",    "March Playtest Night",          "20 min play + 10 min feedback per game.",                    "Impact Hub Berlin",                       -5,  3,  25,  8),
    ("Movie Club",         "Sci-Fi Double Bill",            "Arrival + Annihilation back to back.",                       "Kino Babylon, Berlin",                    -4,  5,  80,  7),
    ("Morning Runners",    "Sunday Long Run — 12K",         "Easy pace, scenic route through the forest.",                "Grunewald, Berlin",                       -3,  2,  None, 5),
    ("Foodies Unite",      "Neukölln Street Food Tour",     "Guided walk through the best eats in Neukölln.",             "Neukölln, Berlin",                        -2,  3,  None, 4),
    ("CS Study Group",     "Mock Technical Interviews",     "Practice coding interviews in pairs. Python / JS.",          "Online — Zoom",                           -1,  2,  30,  3),

    # ── This week / very near future ─────────────────────────────────────────
    ("Valorant Squad",     "Ranked Night — 5-Stack",        "Coordinated ranked queue. Discord VC required.",             "Online — Discord",                        2,   3,  None, 2),
    ("Board Game Nights",  "Ticket to Ride Europe",         "Full game — 3–5 players. Beginners welcome.",                "Spielwiese Berlin",                       3,   3,  10,  2),
    ("Morning Runners",    "Sunday Long Run — 10K",         "Easy pace, scenic route through the park.",                  "Volkspark Friedrichshain",                3,   2,  None, 1),
    ("Photography Club",   "Portrait Workshop",             "Shoot and critique portraits in pairs.",                     "Studio 42, Kreuzberg",                    5,   3,  20,  1),
    ("Gym Accountability", "PR Challenge Day",              "Log your best lifts. Coaches on hand.",                      "Kraftwerk Gym, Berlin",                   6,   2,  None, 1),

    # ── Coming up (2–4 weeks out) ─────────────────────────────────────────────
    ("Indie Game Devs",    "April Playtest Night",          "20 min play + 10 min feedback per game.",                    "Impact Hub Berlin",                       10,  3,  25,  3),
    ("Language Exchange",  "Café Conversation Evening",     "Tables by language pair. All levels welcome.",               "Einstein Café, Berlin",                   11,  2,  None, 2),
    ("Football Pickup",    "Weekend Pickup Game",           "7v7 on grass. Arrive 10 mins early.",                        "Tempelhof Field, Section C",              12,  2,  None, 3),
    ("Digital Artists",    "Illustration Jam",              "3-hour collaborative illustration sprint.",                  "Co.up, Adalbertstr. 8, Berlin",           14,  3,  40,  4),
    ("Songwriters",        "Open Mic & Feedback Night",     "5 minutes per act. Kind crowd, honest notes.",               "Privatclub, Berlin",                      16,  3,  None, 5),
    ("Math Nerds",         "Linear Algebra Study Sprint",   "Eigenvectors, matrix decomposition, and pain.",              "Online — Zoom",                           18,  2,  None, 4),
    ("Movie Club",         "Double Feature Night",          "Two films, one theme. Debate after both.",                   "Kino Babylon, Berlin",                    21,  5,  80,  7),
    ("Retro Gamers",       "N64 Tournament",                "Mario Kart 64 + GoldenEye bracket. Bring your A-game.",      "Player One Bar, Berlin",                  23,  4,  16,  5),

    # ── Further out (1–2 months) ──────────────────────────────────────────────
    ("Board Game Nights",  "Strategy Game Marathon",        "Twilight Imperium full game. 6 hours minimum.",              "Spielwiese Berlin",                       30,  6,  6,   10),
    ("Foodies Unite",      "Kreuzberg Food Market",         "Meet at the market, eat your way through it.",               "Markthalle Neun, Berlin",                 32,  3,  None, 8),
    ("CS Study Group",     "System Design Deep Dive",       "Distributed systems, caching, and databases.",               "Online — Zoom",                           35,  3,  40,  9),
    ("Gym Accountability", "Summer Shape-Up Kickoff",       "6-week challenge starts here. Track everything.",            "Kraftwerk Gym, Berlin",                   38,  2,  None, 7),
    ("Photography Club",   "Street Photography Walk",       "Explore Mitte through a lens. All skill levels.",            "Alexanderplatz, Berlin",                  42,  3,  None, 6),
    ("Valorant Squad",     "Summer Tournament",             "Brackets open. Prize pool for top 3 teams.",                 "Online — Discord",                        45,  4,  None, 8),
    ("Morning Runners",    "Half Marathon Prep Run — 18K",  "Longest training run before the race. Bring gels.",          "Tempelhofer Feld, Berlin",                50,  3,  None, 5),
    ("Movie Club",         "Director Retrospective Night",  "Three films by one director. Vote for the director.",        "Kino Babylon, Berlin",                    56,  6,  80,  10),
]

SEED_USER_EMAILS = [
    "alex.rivera@example.com",
    "jordan.lee@example.com",
    "priya.sharma@example.com",
    "sam.okonkwo@example.com",
    "maya.chen@example.com",
]


class Command(BaseCommand):
    help = "Seed the database with sample events (past, present, future) for development/testing."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all existing events before seeding.",
        )

    def handle(self, *args, **options):
        # Disconnect notification signals — seed runs without Redis/Celery
        from apps.notifications.signals import notify_new_event, notify_rsvp
        post_save.disconnect(notify_new_event, sender=Event)
        post_save.disconnect(notify_rsvp, sender=RSVP)

        try:
            self._seed(options)
        finally:
            post_save.connect(notify_new_event, sender=Event)
            post_save.connect(notify_rsvp, sender=RSVP)

    def _seed(self, options):
        if options["clear"]:
            deleted, _ = Event.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Deleted {deleted} events."))

        organiser, created = User.objects.get_or_create(
            email="seed@hivemind.dev",
            defaults={"display_name": "Seed Bot", "is_active": True},
        )
        if created:
            organiser.set_password("SeedPass123!")
            organiser.save()

        rsvp_users = list(User.objects.filter(email__in=SEED_USER_EMAILS))
        now = timezone.now()
        created_count = 0

        for (community_name, title, description, location_text,
             start_offset_days, duration_hours, capacity, created_at_days_ago) in SEED_EVENTS:

            community = Community.objects.filter(name=community_name).first()
            if not community:
                self.stdout.write(
                    self.style.WARNING(f"  Community '{community_name}' not found — skipping '{title}'.")
                )
                continue

            start = now + timedelta(days=start_offset_days)
            end = start + timedelta(hours=duration_hours)

            events_channel = community.channels.filter(
                channel_type="events"
            ).first()

            event, was_created = Event.objects.get_or_create(
                title=title,
                community=community,
                defaults={
                    "description": description,
                    "location_text": location_text,
                    "organiser": organiser,
                    "start_datetime": start,
                    "end_datetime": end,
                    "capacity": capacity,
                    "channel": events_channel,
                },
            )

            if was_created:
                # Spread created_at so events appear naturally interleaved in the feed
                jitter_minutes = random.uniform(-90, 90)
                created_at = now - timedelta(days=created_at_days_ago) + timedelta(minutes=jitter_minutes)
                Event.objects.filter(pk=event.pk).update(created_at=created_at)

                created_count += 1

                for i, user in enumerate(rsvp_users):
                    rsvp_status = [
                        RSVP.Status.GOING,
                        RSVP.Status.GOING,
                        RSVP.Status.INTERESTED,
                        RSVP.Status.GOING,
                        RSVP.Status.NOT_GOING,
                    ][i % 5]
                    RSVP.objects.get_or_create(event=event, user=user, defaults={"status": rsvp_status})

        skipped = len(SEED_EVENTS) - created_count
        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Created {created_count} events"
                + (f", skipped {skipped} (already exist)." if skipped else ".")
            )
        )

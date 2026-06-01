from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from apps.communities.models import Community
from apps.events.models import Event, RSVP

User = get_user_model()

# (community_name, title, description, location_text, start_offset_days, duration_hours, capacity)
SEED_EVENTS = [
    # Past
    ("Morning Runners",     "5K Time Trial",               "Monthly timed 5K — all paces, chip timing.", "Tiergarten, Berlin",               -14, 1,  None),
    ("Football Pickup",     "Saturday 5-a-side",            "Casual pickup — bring boots and water.",      "Tempelhof Field, Berlin",          -10, 2,  None),
    ("CS Study Group",      "Algorithms Workshop",          "Big-O, sorting, and graph traversal deep dive.", "Online — Zoom",                -7,  3,  50),
    ("Board Game Nights",   "Settlers of Catan Night",      "6-player Catan marathon. Bring snacks.",     "Cafe Morgenrot, Berlin",           -5,  4,  12),
    ("Photography Club",    "Golden Hour Walk",             "Street photography at dusk. All cameras welcome.", "Hackescher Markt, Berlin",   -3,  2,  None),

    # Near future
    ("CS Study Group",      "Mock Technical Interviews",    "Practice coding interviews in pairs. Python / JS.", "Online — Zoom",            2,   2,  30),
    ("Morning Runners",     "Sunday Long Run — 10K",        "Easy pace, scenic route through the park.",   "Volkspark Friedrichshain",         3,   2,  None),
    ("Valorant Squad",      "Ranked Night — 5-Stack",       "Coordinated ranked queue. Discord VC required.", "Online — Discord",              4,   3,  None),
    ("Photography Club",    "Portrait Workshop",            "Shoot and critique portraits in pairs.",      "Studio 42, Kreuzberg",             5,   3,  20),
    ("Indie Game Devs",     "Monthly Playtest Night",       "20 min play + 10 min feedback per game.",    "Impact Hub Berlin",                6,   3,  25),
    ("Language Exchange",   "Café Conversation Evening",    "Tables by language pair. All levels welcome.", "Einstein Café, Berlin",           7,   2,  None),
    ("Football Pickup",     "Weekend Pickup Game",          "7v7 on grass. Arrive 10 mins early.",         "Tempelhof Field, Section C",       8,   2,  None),
    ("Gym Accountability",  "PR Challenge Day",             "Log your best lifts. Coaches on hand.",       "Kraftwerk Gym, Berlin",            9,   2,  None),
    ("Digital Artists",     "Illustration Jam",             "3-hour collaborative illustration sprint.",   "Co.up, Adalbertstr. 8, Berlin",    10,  3,  40),
    ("Songwriters",         "Open Mic & Feedback Night",    "5 minutes per act. Kind crowd, honest notes.", "Privatclub, Berlin",              12,  3,  None),
    ("Movie Club",          "Double Feature Night",         "Two films, one theme. Debate after both.",    "Kino Babylon, Berlin",             14,  5,  80),
    ("Board Game Nights",   "Strategy Game Marathon",       "Twilight Imperium full game. 6 hours minimum.", "Spielwiese Berlin",             15,  6,  6),
    ("Math Nerds",          "Linear Algebra Study Sprint",  "Eigenvectors, matrix decomposition, and pain.", "Online — Zoom",                 16,  2,  None),
    ("Retro Gamers",        "N64 Tournament",               "Mario Kart 64 + GoldenEye bracket. Bring your A-game.", "Player One Bar, Berlin", 18,  4,  16),
    ("Foodies Unite",       "Neukölln Street Food Tour",    "Guided walk through the best eats in Neukölln.", "Neukölln, Berlin",             21,  3,  None),
]

SEED_USER_EMAILS = [
    "alex.rivera@example.com",
    "jordan.lee@example.com",
    "priya.sharma@example.com",
    "sam.okonkwo@example.com",
    "maya.chen@example.com",
]


class Command(BaseCommand):
    help = "Seed the database with sample events for development/testing."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all existing events before seeding.",
        )

    def handle(self, *args, **options):
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
             offset_days, duration_hours, capacity) in SEED_EVENTS:

            community = Community.objects.filter(name=community_name).first()
            if not community:
                self.stdout.write(self.style.WARNING(f"  Community '{community_name}' not found — skipping '{title}'."))
                continue

            start = now + timedelta(days=offset_days)
            end = start + timedelta(hours=duration_hours)

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
                },
            )

            if was_created:
                created_count += 1
                for i, user in enumerate(rsvp_users):
                    status = [RSVP.Status.GOING, RSVP.Status.GOING, RSVP.Status.INTERESTED,
                              RSVP.Status.GOING, RSVP.Status.NOT_GOING][i % 5]
                    RSVP.objects.get_or_create(event=event, user=user, defaults={"status": status})

        skipped = len(SEED_EVENTS) - created_count
        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Created {created_count} events"
                + (f", skipped {skipped} (already exist)." if skipped else ".")
            )
        )

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.communities.models import Community, Membership

User = get_user_model()

# member_count = extra members added on top of the owner (owner always = 1)
SEED_DATA = [
    # Study
    {"name": "CS Study Group", "type": "study", "description": "Computer science homework & exam prep.", "members": 120},
    {"name": "Math Nerds", "type": "study", "description": "Calculus, linear algebra, and beyond.", "members": 45},
    {"name": "Language Exchange", "type": "study", "description": "Practice languages with native speakers.", "members": 8},
    # Gaming
    {"name": "Valorant Squad", "type": "gaming", "description": "Rank up together. All ranks welcome.", "members": 300},
    {"name": "Indie Game Devs", "type": "gaming", "description": "Build, share, and playtest indie games.", "members": 60},
    {"name": "Retro Gamers", "type": "gaming", "description": "Classic consoles and nostalgia trips.", "members": 22},
    # Sports
    {"name": "Morning Runners", "type": "sports", "description": "5 am runs, all paces welcome.", "members": 75},
    {"name": "Football Pickup", "type": "sports", "description": "Casual 5-a-side every weekend.", "members": 18},
    {"name": "Gym Accountability", "type": "sports", "description": "Share goals, log PRs, stay consistent.", "members": 200},
    # Creative
    {"name": "Digital Artists", "type": "creative", "description": "Illustration, UI design, and concept art.", "members": 150},
    {"name": "Songwriters", "type": "creative", "description": "Share lyrics, get feedback, collaborate.", "members": 33},
    {"name": "Photography Club", "type": "creative", "description": "Weekly photo prompts and critiques.", "members": 90},
    # Social
    {"name": "Board Game Nights", "type": "social", "description": "Settlers, Catan, Ticket to Ride, and more.", "members": 55},
    {"name": "Movie Club", "type": "social", "description": "One film a week, then we argue about it.", "members": 110},
    {"name": "Foodies Unite", "type": "social", "description": "Restaurant recs, recipes, and food pics.", "members": 250},
]


class Command(BaseCommand):
    help = "Seed the database with sample communities and varied member counts for development/testing."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all existing communities before seeding.",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            deleted, _ = Community.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Deleted {deleted} communities."))

        owner, created = User.objects.get_or_create(
            email="seed@hivemind.dev",
            defaults={"display_name": "Seed Bot", "is_active": True},
        )
        if created:
            owner.set_password("SeedPass123!")
            owner.save()
            self.stdout.write(f"Created seed user: {owner.email}")

        created_count = 0
        for item in SEED_DATA:
            community, was_created = Community.objects.get_or_create(
                name=item["name"],
                defaults={
                    "description": item["description"],
                    "community_type": item["type"],
                    "owner": owner,
                },
            )
            if was_created:
                Membership.objects.get_or_create(
                    community=community,
                    user=owner,
                    defaults={"role": Membership.Role.OWNER},
                )
                self._add_fake_members(community, item["members"])
                created_count += 1

        skipped = len(SEED_DATA) - created_count
        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Created {created_count} communities"
                + (f", skipped {skipped} (already exist)." if skipped else ".")
            )
        )

    def _add_fake_members(self, community: Community, count: int) -> None:
        for i in range(count):
            email = f"member_{community.name[:8].lower().replace(' ', '_')}_{i}@seed.dev"
            user, _ = User.objects.get_or_create(
                email=email,
                defaults={"display_name": f"Member {i}", "is_active": True},
            )
            Membership.objects.get_or_create(
                community=community,
                user=user,
                defaults={"role": Membership.Role.MEMBER},
            )

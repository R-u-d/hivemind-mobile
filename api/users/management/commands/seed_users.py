from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()

SEED_USERS = [
    {"email": "alex.rivera@example.com", "display_name": "Alex Rivera", "bio": "Coffee addict and part-time philosopher."},
    {"email": "jordan.lee@example.com", "display_name": "Jordan Lee", "bio": "Avid reader. Slow runner."},
    {"email": "priya.sharma@example.com", "display_name": "Priya Sharma", "bio": "Software engineer by day, chef by night."},
    {"email": "sam.okonkwo@example.com", "display_name": "Sam Okonkwo", "bio": "Basketball fan. Still believe in the underdog."},
    {"email": "maya.chen@example.com", "display_name": "Maya Chen", "bio": "Photographer | Travel junkie | Dog mum."},
    {"email": "lucas.martin@example.com", "display_name": "Lucas Martin", "bio": "Studying comp sci. Surviving on instant noodles."},
    {"email": "sofia.ahmed@example.com", "display_name": "Sofia Ahmed", "bio": "Linguistics nerd. Speak 4 languages badly."},
    {"email": "ethan.wu@example.com", "display_name": "Ethan Wu", "bio": "Gym rat who reads too many sci-fi novels."},
    {"email": "chloe.nguyen@example.com", "display_name": "Chloe Nguyen", "bio": "UX designer obsessed with tiny details."},
    {"email": "omar.hassan@example.com", "display_name": "Omar Hassan", "bio": "Building side projects at midnight since 2019."},
]

DEFAULT_PASSWORD = "DevPass123!"


class Command(BaseCommand):
    help = "Seed the database with sample users for development/testing."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all non-superuser, non-staff seed users before seeding.",
        )

    def handle(self, *args, **options):
        seed_emails = {u["email"] for u in SEED_USERS}

        if options["clear"]:
            deleted, _ = User.objects.filter(email__in=seed_emails).delete()
            self.stdout.write(self.style.WARNING(f"Deleted {deleted} seed users."))

        created_count = 0
        for item in SEED_USERS:
            user, was_created = User.objects.get_or_create(
                email=item["email"],
                defaults={
                    "display_name": item["display_name"],
                    "bio": item["bio"],
                    "is_active": True,
                },
            )
            if was_created:
                user.set_password(DEFAULT_PASSWORD)
                user.save()
                created_count += 1

        skipped = len(SEED_USERS) - created_count
        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Created {created_count} users"
                + (f", skipped {skipped} (already exist)." if skipped else ".")
            )
        )
        self.stdout.write(f"Password for all seed users: {DEFAULT_PASSWORD}")

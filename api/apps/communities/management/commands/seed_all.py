from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db.models.signals import post_save


class Command(BaseCommand):
    help = (
        "Seed the entire database with fake development data in one step. "
        "Runs all seeders in foreign-key order: users -> communities -> channels "
        "-> events -> posts. Safe to re-run (each step is idempotent)."
    )

    def handle(self, *args, **options):
        # Notification signals fire on every insert and try to reach Redis/Celery.
        # Disconnect them for the whole seed run so inserts are fast and offline.
        signals = self._disconnect_notification_signals()
        try:
            steps = [
                ("seed_users", {}),
                ("seed_communities", {}),
                ("backfill_default_channels", {}),
                ("seed_events", {"clear": True}),
                ("seed_posts", {"clear": True}),
            ]
            for name, kwargs in steps:
                self.stdout.write(self.style.MIGRATE_HEADING(f"\n>>> {name}"))
                call_command(name, **kwargs)
        finally:
            self._reconnect_notification_signals(signals)

        self.stdout.write(
            self.style.SUCCESS(
                "\nAll seed data created. Register an account in the app to log in."
            )
        )

    def _disconnect_notification_signals(self):
        from apps.communities.models import Membership, Post
        from apps.events.models import RSVP, Event
        from apps.notifications.signals import (
            notify_member_join,
            notify_new_event,
            notify_new_post,
            notify_rsvp,
        )

        pairs = [
            (notify_new_post, Post),
            (notify_new_event, Event),
            (notify_rsvp, RSVP),
            (notify_member_join, Membership),
        ]
        for receiver, sender in pairs:
            post_save.disconnect(receiver, sender=sender)
        return pairs

    def _reconnect_notification_signals(self, pairs):
        for receiver, sender in pairs:
            post_save.connect(receiver, sender=sender)

import django.core.cache as cache_module
from celery import shared_task
from django.utils import timezone
from datetime import timedelta

from .models import Notification
from .services import build_messages_for, notify, send_expo_push

_cache = cache_module.cache

EVENT_REMINDER_DEDUP_TIMEOUT = 60 * 60 * 25  # 25h — prevent double-fire on overlapping runs


@shared_task
def fan_out(recipient_ids, notification_type, title, body="", data=None):
    """Create + dispatch a notification for many recipients off the request path.

    If `data` contains `push: False` the in-app row is still created but no
    push is delivered (digest suppression for broadcast notifications).
    """
    data = data or {}
    push = data.pop("push", True)
    notify(recipient_ids, notification_type, title, body=body, data=data, push=push)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def dispatch_notification(self, notification_id):
    """Deliver a single Notification to all of the recipient's registered devices."""
    try:
        notification = Notification.objects.get(id=notification_id)
    except Notification.DoesNotExist:
        return

    messages = build_messages_for(notification)
    if not messages:
        return

    try:
        send_expo_push(messages)
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task
def send_event_reminders():
    """Send a day-before push reminder to everyone who RSVPd 'going' to events
    starting in the next 20–28 hours. Runs daily at 09:00 UTC via Celery Beat.
    A Redis dedup key prevents double-firing when run windows overlap.
    """
    from apps.events.models import RSVP

    now = timezone.now()
    window_start = now + timedelta(hours=20)
    window_end = now + timedelta(hours=28)

    rsvps = (
        RSVP.objects.filter(
            status=RSVP.Status.GOING,
            event__start_datetime__gte=window_start,
            event__start_datetime__lte=window_end,
        )
        .select_related("event", "user")
    )

    for rsvp in rsvps:
        dedup_key = f"notif:reminder:{rsvp.event_id}:{rsvp.user_id}"
        if _cache.get(dedup_key):
            continue

        notify(
            [str(rsvp.user_id)],
            Notification.Type.EVENT_REMINDER,
            f"Reminder: {rsvp.event.title} is tomorrow",
            rsvp.event.location_text or "",
            {"event_id": str(rsvp.event_id)},
        )
        _cache.set(dedup_key, True, EVENT_REMINDER_DEDUP_TIMEOUT)

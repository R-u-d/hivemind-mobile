from celery import shared_task

from .models import Notification
from .services import build_messages_for, notify, send_expo_push


@shared_task
def fan_out(recipient_ids, notification_type, title, body="", data=None):
    """Create + dispatch a notification for many recipients off the request path."""
    notify(recipient_ids, notification_type, title, body=body, data=data)


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
    except Exception as exc:  # network/Expo errors → retry with backoff
        raise self.retry(exc=exc)

"""Notification creation + Expo push delivery.

`notify()` is the single entry point the rest of the codebase uses: it persists a
Notification row per recipient and queues async delivery. The HTTP call to Expo
uses stdlib urllib so there is no extra runtime dependency to mock in tests.
"""

import json
import urllib.request

from django.conf import settings

from .models import Notification, PushToken


def notify(recipient_ids, notification_type, title, body="", data=None):
    """Create a Notification row per recipient and queue push delivery for each.

    `recipient_ids` is an iterable of user id strings (kept as ids rather than
    User instances so this is callable from a Celery task). Returns the created
    Notification ids. The task import is deferred to avoid a circular import
    (tasks -> services -> tasks).
    """
    from .tasks import dispatch_notification

    data = data or {}
    notification_ids = []
    for recipient_id in recipient_ids:
        notification = Notification.objects.create(
            recipient_id=recipient_id,
            notification_type=notification_type,
            title=title,
            body=body,
            data=data,
        )
        notification_ids.append(str(notification.id))
        dispatch_notification.delay(str(notification.id))
    return notification_ids


def send_expo_push(messages):
    """POST a batch of Expo push messages. `messages` is a list of dicts.

    Each message: {"to": <token>, "title": ..., "body": ..., "data": {...}}.
    Returns the parsed JSON response from Expo.
    """
    payload = json.dumps(messages).encode("utf-8")
    request = urllib.request.Request(
        settings.EXPO_PUSH_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def build_messages_for(notification):
    """Build Expo push messages for every device token the recipient has registered."""
    tokens = PushToken.objects.filter(user=notification.recipient).values_list("token", flat=True)
    return [
        {
            "to": token,
            "title": notification.title,
            "body": notification.body,
            "data": {**notification.data, "notification_id": str(notification.id)},
        }
        for token in tokens
    ]

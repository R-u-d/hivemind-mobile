import django.core.cache as cache_module
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.communities.models import Membership, Post
from apps.events.models import RSVP, Event

from .models import Notification
from .tasks import fan_out

_cache = cache_module.cache

POST_DIGEST_TIMEOUT = 60 * 60  # 1 hour — suppress repeat post pushes per community


def _community_member_ids(community, exclude_user_id):
    return [
        str(uid)
        for uid in Membership.objects.filter(community=community)
        .exclude(user_id=exclude_user_id)
        .values_list("user_id", flat=True)
    ]


@receiver(post_save, sender=Post)
def notify_new_post(sender, instance, created, **kwargs):
    if not created:
        return
    community = instance.channel.community
    recipient_ids = _community_member_ids(community, instance.author_id)
    if not recipient_ids:
        return

    digest_key = f"notif:digest:{community.id}"
    already_sent = _cache.get(digest_key)
    fan_out.delay(
        recipient_ids,
        Notification.Type.NEW_POST,
        f"New post in {community.name}",
        instance.body[:140],
        {
            "community_id": str(community.id),
            "channel_id": str(instance.channel_id),
            "post_id": str(instance.id),
            "push": not already_sent,
        },
    )
    if not already_sent:
        _cache.set(digest_key, True, POST_DIGEST_TIMEOUT)


@receiver(post_save, sender=Event)
def notify_new_event(sender, instance, created, **kwargs):
    if not created:
        return
    recipient_ids = _community_member_ids(instance.community, instance.organiser_id)
    if not recipient_ids:
        return
    fan_out.delay(
        recipient_ids,
        Notification.Type.NEW_EVENT,
        f"New event: {instance.title}",
        instance.description[:140],
        {"community_id": str(instance.community_id), "event_id": str(instance.id)},
    )


@receiver(post_save, sender=RSVP)
def notify_rsvp(sender, instance, created, **kwargs):
    if not created or instance.status != RSVP.Status.GOING:
        return
    event = instance.event
    if event.organiser_id == instance.user_id:
        return
    fan_out.delay(
        [str(event.organiser_id)],
        Notification.Type.RSVP,
        f"{instance.user.display_name} is going to {event.title}",
        "",
        {"event_id": str(event.id), "user_id": str(instance.user_id)},
    )


@receiver(post_save, sender=Membership)
def notify_member_join(sender, instance, created, **kwargs):
    # Only on initial join, not role updates. Ignore owner auto-membership on community create.
    if not created or instance.role != Membership.Role.MEMBER:
        return
    community = instance.community
    mod_ids = [
        str(uid)
        for uid in Membership.objects.filter(
            community=community,
            role__in=[Membership.Role.MODERATOR, Membership.Role.OWNER],
        )
        .exclude(user_id=instance.user_id)
        .values_list("user_id", flat=True)
    ]
    if not mod_ids:
        return
    fan_out.delay(
        mod_ids,
        Notification.Type.MEMBER_JOIN,
        f"{instance.user.display_name} joined {community.name}",
        "",
        {"community_id": str(community.id), "user_id": str(instance.user_id)},
    )

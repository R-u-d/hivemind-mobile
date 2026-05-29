import base64
from datetime import datetime, timezone as dt_timezone

from django.db.models import Count, Q
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.communities.models import Membership, Post
from apps.communities.serializers import PostSerializer
from apps.events.models import Event, RSVP
from apps.events.serializers import EventListSerializer

PAGE_SIZE = 20


def _encode_cursor(dt: datetime) -> str:
    return base64.urlsafe_b64encode(dt.isoformat().encode()).decode()


def _decode_cursor(raw: str) -> datetime | None:
    try:
        ts_str = base64.urlsafe_b64decode(raw.encode()).decode()
        dt = datetime.fromisoformat(ts_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=dt_timezone.utc)
        return dt
    except Exception:
        return None


class FeedView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        community_ids = list(
            Membership.objects.filter(user=request.user).values_list("community_id", flat=True)
        )

        cursor_param = request.query_params.get("cursor")
        cursor_ts = _decode_cursor(cursor_param) if cursor_param else None

        posts_qs = (
            Post.objects.filter(channel__community_id__in=community_ids)
            .select_related("author", "channel")
            .order_by("-created_at")
        )
        events_qs = (
            Event.objects.filter(community_id__in=community_ids)
            .select_related("organiser", "community", "channel")
            .annotate(
                going_count=Count("rsvps", filter=Q(rsvps__status=RSVP.Status.GOING)),
                interested_count=Count("rsvps", filter=Q(rsvps__status=RSVP.Status.INTERESTED)),
            )
            .order_by("-created_at")
        )

        if cursor_ts is not None:
            posts_qs = posts_qs.filter(created_at__lt=cursor_ts)
            events_qs = events_qs.filter(created_at__lt=cursor_ts)

        posts = list(posts_qs[: PAGE_SIZE + 1])
        events = list(events_qs[: PAGE_SIZE + 1])

        merged = sorted(
            [("post", p.created_at, p) for p in posts]
            + [("event", e.created_at, e) for e in events],
            key=lambda x: x[1],
            reverse=True,
        )

        has_next = len(merged) > PAGE_SIZE
        page = merged[:PAGE_SIZE]

        results = []
        for item_type, _, obj in page:
            if item_type == "post":
                data = PostSerializer(obj, context={"request": request}).data
            else:
                data = EventListSerializer(obj, context={"request": request}).data
            results.append({"type": item_type, **data})

        next_cursor = None
        if has_next and page:
            last_ts = page[-1][1]
            next_cursor = request.build_absolute_uri(
                f"/api/feed/?cursor={_encode_cursor(last_ts)}"
            )

        return Response({"next": next_cursor, "results": results})

from rest_framework.pagination import CursorPagination


class CreatedAtCursorPagination(CursorPagination):
    page_size = 20
    ordering = "-created_at"
    cursor_query_param = "cursor"


class JoinedAtCursorPagination(CursorPagination):
    page_size = 20
    ordering = "joined_at"
    cursor_query_param = "cursor"


class MemberCountCursorPagination(CursorPagination):
    page_size = 20
    ordering = ("-member_count", "name", "id")
    cursor_query_param = "cursor"


class StartsAtCursorPagination(CursorPagination):
    page_size = 20
    ordering = ("start_datetime", "id")
    cursor_query_param = "cursor"

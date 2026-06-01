from django.contrib import admin

from .models import Notification, PushToken


@admin.register(PushToken)
class PushTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "platform", "created_at")
    list_filter = ("platform",)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("recipient", "notification_type", "is_read", "created_at")
    list_filter = ("notification_type", "is_read")

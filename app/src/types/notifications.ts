export type NotificationType = 'new_post' | 'new_event' | 'event_reminder' | 'rsvp' | 'member_join';

export interface AppNotification {
  id: string;
  notification_type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface NotificationPage {
  results: AppNotification[];
  next: string | null;
  previous: string | null;
}

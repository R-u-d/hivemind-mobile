import type { CommunityType } from '@/theme';
import type { PostAuthor } from '@/types/community';
import type { RsvpStatus } from '@/types/event';

export interface FeedPostItem {
  type: 'post';
  id: string;
  channel: string;
  channel_name: string;
  community_id: string;
  community_name: string;
  community_type: CommunityType;
  author: PostAuthor;
  body: string;
  created_at: string;
}

export interface FeedEventItem {
  type: 'event';
  id: string;
  title: string;
  community: { id: string; name: string; type: CommunityType };
  location_text: string;
  lat: number | null;
  lng: number | null;
  start_datetime: string;
  end_datetime: string | null;
  cover_image_url: string | null;
  capacity: number | null;
  going_count: number;
  interested_count: number;
  rsvp_status: RsvpStatus | null;
  created_at: string;
}

export type FeedItem = FeedPostItem | FeedEventItem;

export interface FeedPage {
  next: string | null;
  results: FeedItem[];
}

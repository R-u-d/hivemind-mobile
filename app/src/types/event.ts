import type { CommunityType } from '@/theme';

export interface EventCommunity {
  id: string;
  name: string;
  type: CommunityType;
}

export interface EventOrganiser {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export type RsvpStatus = 'going' | 'interested' | 'not_going';

export interface Event {
  id: string;
  title: string;
  description: string;
  community: EventCommunity;
  channel: string | null;
  location_text: string;
  lat: number | null;
  lng: number | null;
  start_datetime: string;
  end_datetime: string | null;
  cover_image_url: string | null;
  organiser: EventOrganiser;
  capacity: number | null;
  going_count: number;
  interested_count: number;
  rsvp_status: RsvpStatus | null;
  created_at: string;
}

export interface EventPage {
  next: string | null;
  previous: string | null;
  results: Event[];
}

export interface Attendee {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface AttendeePage {
  next: string | null;
  previous: string | null;
  results: Attendee[];
}

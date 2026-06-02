export interface User {
  id: string;
  email: string;
  display_name: string;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
  has_onboarded: boolean;
  created_at: string;
  event_count: number;
}

export interface PublicUser {
  id: string;
  display_name: string;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
  created_at: string;
  community_count: number;
  event_count: number;
}

import type { CommunityType } from '@/theme';

export interface Community {
  id: string;
  name: string;
  type: CommunityType;
  member_count: number;
  created_at: string;
  is_member: boolean;
  cover_image_url: string | null;
  is_private: boolean;
}

export interface CommunityDetail extends Community {
  description: string;
  owner_id: string;
}

export interface CommunityPage {
  next: string | null;
  previous: string | null;
  results: Community[];
}

export type ChannelType = 'announcement' | 'general' | 'events' | 'media';

export interface Channel {
  id: string;
  name: string;
  channel_type: ChannelType;
  description: string;
  created_at: string;
}

export interface ChannelPage {
  next: string | null;
  previous: string | null;
  results: Channel[];
}

export interface Member {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  role: 'member' | 'moderator' | 'owner';
  joined_at: string;
}

export interface MemberPage {
  next: string | null;
  previous: string | null;
  results: Member[];
}

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
  location?: string;
}

export interface CommunityDetail extends Community {
  description: string;
  owner_id: string;
  my_role: 'member' | 'moderator' | 'owner' | null;
}

export interface CommunityPage {
  next: string | null;
  previous: string | null;
  results: Community[];
}

export type ChannelType = 'announcements' | 'general' | 'events' | 'resources' | 'help';

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

export interface PostAuthor {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface Post {
  id: string;
  channel: string;
  author: PostAuthor;
  body: string;
  created_at: string;
}

export interface PostPage {
  next: string | null;
  previous: string | null;
  results: Post[];
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

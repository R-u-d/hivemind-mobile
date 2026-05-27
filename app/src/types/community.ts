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

export interface CommunityPage {
  next: string | null;
  previous: string | null;
  results: Community[];
}

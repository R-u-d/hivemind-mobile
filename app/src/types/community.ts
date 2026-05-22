import type { CommunityType } from '@/theme';

export interface Community {
  id: string;
  name: string;
  type: CommunityType;
  member_count: number;
  created_at: string;
}

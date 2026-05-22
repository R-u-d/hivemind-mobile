import { useQuery } from '@tanstack/react-query';

import { client } from '@/api/client';
import type { Community } from '@/types/community';

async function fetchMyCommunities(): Promise<Community[]> {
  const { data } = await client.get<Community[]>('/users/me/communities/');
  return data;
}

export function useMyCommunities() {
  return useQuery({
    queryKey: ['communities', 'mine'],
    queryFn: fetchMyCommunities,
    retry: false,
  });
}

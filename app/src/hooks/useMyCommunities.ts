import { useQuery } from '@tanstack/react-query';

import { client } from '@/api/client';
import type { Community } from '@/types/community';

async function fetchMyCommunities(signal?: AbortSignal): Promise<Community[]> {
  const { data } = await client.get<Community[]>('/users/me/communities/', { signal });
  return data;
}

export function useMyCommunities() {
  return useQuery({
    queryKey: ['communities', 'mine'],
    queryFn: ({ signal }) => fetchMyCommunities(signal),
    retry: false,
  });
}

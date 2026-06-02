import { useQuery } from '@tanstack/react-query';

import { client } from '@/api/client';
import type { CommunityDetail } from '@/types/community';

async function fetchCommunityDetail(id: string, signal?: AbortSignal): Promise<CommunityDetail> {
  const { data } = await client.get<CommunityDetail>(`/communities/${id}/`, { signal });
  return data;
}

export function useCommunityDetail(id: string) {
  return useQuery({
    queryKey: ['communities', id],
    queryFn: ({ signal }) => fetchCommunityDetail(id, signal),
    retry: false,
  });
}

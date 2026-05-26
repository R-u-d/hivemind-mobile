import { useQuery } from '@tanstack/react-query';

import { client } from '@/api/client';
import type { CommunityType } from '@/theme';
import type { Community } from '@/types/community';

interface PaginatedResponse {
  results: Community[];
}

async function fetchCommunities(types: CommunityType[]): Promise<Community[]> {
  const params = new URLSearchParams();
  types.forEach(t => params.append('type', t));
  const { data } = await client.get<PaginatedResponse>(`/communities/?${params.toString()}`);
  return data.results;
}

export function useCommunities(types: CommunityType[]) {
  return useQuery({
    queryKey: ['communities', { types }],
    queryFn: () => fetchCommunities(types),
    enabled: types.length > 0,
    retry: false,
  });
}

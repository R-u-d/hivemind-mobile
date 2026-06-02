import { useQuery } from '@tanstack/react-query';

import { client } from '@/api/client';
import type { ChannelPage } from '@/types/community';

async function fetchChannels(communityId: string, signal?: AbortSignal): Promise<ChannelPage> {
  const { data } = await client.get<ChannelPage>(`/communities/${communityId}/channels/`, {
    signal,
  });
  return data;
}

export function useCommunityChannels(communityId: string, enabled = true) {
  return useQuery({
    queryKey: ['communities', communityId, 'channels'],
    queryFn: ({ signal }) => fetchChannels(communityId, signal),
    enabled: enabled && !!communityId,
    retry: false,
  });
}

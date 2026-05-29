import { useQuery } from '@tanstack/react-query';

import { client } from '@/api/client';
import type { ChannelPage } from '@/types/community';

async function fetchChannels(communityId: string): Promise<ChannelPage> {
  const { data } = await client.get<ChannelPage>(`/communities/${communityId}/channels/`);
  return data;
}

export function useCommunityChannels(communityId: string, enabled = true) {
  return useQuery({
    queryKey: ['communities', communityId, 'channels'],
    queryFn: () => fetchChannels(communityId),
    enabled: enabled && !!communityId,
    retry: false,
  });
}

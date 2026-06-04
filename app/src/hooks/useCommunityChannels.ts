import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { client } from '@/api/client';
import type { Channel, ChannelPage, ChannelType } from '@/types/community';

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

export function useCreateChannel(communityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; channel_type: ChannelType; description?: string }) =>
      client.post<Channel>(`/communities/${communityId}/channels/`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities', communityId, 'channels'] });
    },
  });
}

export function useDeleteChannel(communityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (channelId: string) =>
      client.delete(`/communities/${communityId}/channels/${channelId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities', communityId, 'channels'] });
    },
  });
}

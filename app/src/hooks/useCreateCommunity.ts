import { useMutation, useQueryClient } from '@tanstack/react-query';

import { client } from '@/api/client';
import type { CommunityType } from '@/theme';

interface CreateCommunityPayload {
  name: string;
  community_type: CommunityType;
  is_private: boolean;
  location?: string;
  description?: string;
}

async function createCommunity(payload: CreateCommunityPayload): Promise<{ id: string }> {
  const { data } = await client.post<{ id: string }>('/communities/', payload);
  return data;
}

export function useCreateCommunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCommunity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
    },
  });
}

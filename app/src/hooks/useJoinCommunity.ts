import { useMutation, useQueryClient } from '@tanstack/react-query';

import { client } from '@/api/client';

async function joinCommunity(id: string): Promise<void> {
  await client.post(`/communities/${id}/join/`);
}

async function leaveCommunity(id: string): Promise<void> {
  await client.delete(`/communities/${id}/leave/`);
}

export function useJoinCommunity(
  onOptimisticJoin: (id: string) => void,
  onRollback: (id: string) => void,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: joinCommunity,
    onMutate: id => {
      onOptimisticJoin(id);
    },
    onError: (_err, id) => {
      onRollback(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useLeaveCommunity(
  onOptimisticLeave: (id: string) => void,
  onRollback: (id: string) => void,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: leaveCommunity,
    onMutate: id => {
      onOptimisticLeave(id);
    },
    onError: (_err, id) => {
      onRollback(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

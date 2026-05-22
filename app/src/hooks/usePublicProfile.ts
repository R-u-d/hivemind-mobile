import { useQuery } from '@tanstack/react-query';

import { client } from '@/api/client';
import type { User } from '@/types/user';

async function fetchPublicProfile(id: string): Promise<User> {
  const { data } = await client.get<User>(`/users/${id}/`);
  return data;
}

export function usePublicProfile(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => fetchPublicProfile(id),
    enabled: !!id,
  });
}

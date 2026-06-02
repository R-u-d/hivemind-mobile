import { useQuery } from '@tanstack/react-query';

import { client } from '@/api/client';
import type { PublicUser } from '@/types/user';

async function fetchPublicProfile(id: string): Promise<PublicUser> {
  const { data } = await client.get<PublicUser>(`/users/${id}/`);
  return data;
}

export function usePublicProfile(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => fetchPublicProfile(id),
    enabled: !!id,
  });
}

import { useQuery } from '@tanstack/react-query';

import { client } from '@/api/client';
import type { User } from '@/types/user';

async function fetchCurrentUser(): Promise<User> {
  const { data } = await client.get<User>('/users/me/');
  return data;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['users', 'me'],
    queryFn: fetchCurrentUser,
  });
}

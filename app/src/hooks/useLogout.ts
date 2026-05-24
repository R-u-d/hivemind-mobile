import { useMutation } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';

import { client } from '@/api/client';
import { tokenStorage } from '@/api/tokenStorage';

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      const refresh = await tokenStorage.getRefresh();
      await tokenStorage.clear();
      router.replace('/(auth)/login' as Href);
      // best-effort server-side blacklist — fire and forget
      client.post('/auth/logout/', { refresh }).catch(() => {});
    },
  });
}

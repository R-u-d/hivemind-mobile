import { useMutation } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';

import { client } from '@/api/client';
import { tokenStorage } from '@/api/tokenStorage';

async function logout() {
  const refresh = await tokenStorage.getRefresh();
  try {
    await client.post('/auth/logout/', { refresh });
  } catch {
    // best-effort server-side blacklist; tokens always cleared via onSettled
  }
}

export function useLogout() {
  return useMutation({
    mutationFn: logout,
    onSettled: async () => {
      await tokenStorage.clear();
      router.replace('/(auth)/login' as Href);
    },
  });
}

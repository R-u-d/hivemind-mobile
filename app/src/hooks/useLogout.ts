import { useMutation } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';

import { client } from '@/api/client';
import { tokenStorage } from '@/api/tokenStorage';
import { deletePushToken } from '@/api/notifications';

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      // Deregister this device's push token before clearing auth — requires a valid Bearer token.
      try {
        const pushToken = await tokenStorage.getPushToken();
        if (pushToken) {
          await deletePushToken(pushToken);
          await tokenStorage.clearPushToken();
        }
      } catch {
        // Non-fatal — backend cleans up stale tokens naturally.
      }

      const refresh = await tokenStorage.getRefresh();
      await tokenStorage.clear();
      router.replace('/(auth)/login' as Href);
      // best-effort server-side blacklist — fire and forget
      client.post('/auth/logout/', { refresh }).catch(() => {});
    },
  });
}

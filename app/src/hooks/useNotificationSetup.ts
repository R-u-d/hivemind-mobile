import { useCallback, useEffect, useRef, useState } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { registerPushToken } from '@/api/notifications';
import { tokenStorage } from '@/api/tokenStorage';
import { routeFromNotificationData } from '@/utils/notificationRouting';
import type { InAppNotification } from '@/components/InAppNotificationBanner';

// Controls how notifications behave while the app is foregrounded.
// Must be set at module level (before any component mounts).
// Using shouldShowBanner/shouldShowList (SDK 53+ API — shouldShowAlert is no-op).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false, // suppressed — we show our own in-app banner instead
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

export function useNotificationSetup() {
  const queryClient = useQueryClient();
  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermissionStatus>('undetermined');
  const [incomingNotification, setIncomingNotification] = useState<InAppNotification | null>(null);
  const receivedListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  const clearIncomingNotification = useCallback(() => setIncomingNotification(null), []);

  useEffect(() => {
    // Push notifications are only supported on physical devices.
    if (!Device.isDevice) return;

    (async () => {
      // Check current permission state first — never prompt if already decided.
      const { status: existing } = await Notifications.getPermissionsAsync();

      let finalStatus = existing;
      if (existing === 'undetermined') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      setPermissionStatus(finalStatus as NotificationPermissionStatus);

      if (finalStatus !== 'granted') return;

      // Android requires a notification channel before any push can appear.
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'HiveMind',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6D28D9',
        });
      }

      // Fetch the Expo push token and register it with the backend.
      const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
      if (!projectId) {
        console.warn('useNotificationSetup: no EAS projectId in app.json — token fetch skipped');
        return;
      }

      try {
        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
        await registerPushToken(token, Platform.OS as 'ios' | 'android');
        await tokenStorage.setPushToken(token);
      } catch (err) {
        // Non-fatal — user is still logged in; push just won't work.
        console.warn('useNotificationSetup: token registration failed', err);
      }
    })();

    // Foreground: notification arrives while app is open → show in-app banner + refresh inbox.
    receivedListener.current = Notifications.addNotificationReceivedListener(notification => {
      setIncomingNotification({
        title: notification.request.content.title ?? '',
        body: notification.request.content.body ?? '',
        data: notification.request.content.data as Record<string, unknown>,
      });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    // Warm-start: app backgrounded, user taps notification → deep link + refresh inbox.
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      const href = routeFromNotificationData(data);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      if (href) router.push(href);
    });

    return () => {
      receivedListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return { permissionStatus, incomingNotification, clearIncomingNotification };
}

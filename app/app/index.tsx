import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import type { Href } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';

import { client } from '@/api/client';
import { tokenStorage } from '@/api/tokenStorage';
import HexLoader from '@/components/HexLoader';
import { useTheme } from '@/theme/ThemeContext';
import { routeFromNotificationData } from '@/utils/notificationRouting';

type Destination = '/(tabs)/feed' | '/(auth)/login' | '/(onboarding)';

async function consumeLastNotificationDeepLink(): Promise<Href | null> {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) return null;
  // Clear immediately so reopening the app normally doesn't replay this tap.
  await Notifications.clearLastNotificationResponseAsync();
  const data = response.notification.request.content.data as Record<string, unknown>;
  return routeFromNotificationData(data);
}

export default function Index() {
  const [destination, setDestination] = useState<Destination | null>(null);
  const themeColors = useTheme();

  useEffect(() => {
    (async () => {
      try {
        const token = await tokenStorage.getAccess();
        if (!token) {
          setDestination('/(auth)/login');
          return;
        }
        // Server-side has_onboarded is the source of truth — it's per-account,
        // unlike the device-level hm_onboarded flag which goes stale across accounts.
        const { data } = await client.get<{ has_onboarded: boolean }>('/users/me/');
        if (!data.has_onboarded) {
          setDestination('/(onboarding)');
          return;
        }
        // Cold-start: if the app was opened by tapping a notification, route there directly.
        // Response is cleared here so re-opening the app normally never replays the tap.
        const deepLink = await consumeLastNotificationDeepLink();
        setDestination((deepLink as Destination) ?? '/(tabs)/feed');
      } catch {
        // If tokens were cleared (server confirmed rejection), go to login.
        // If tokens still exist (network unreachable), go to feed and let it show error state.
        const stillValid = await tokenStorage.getAccess();
        setDestination(stillValid ? '/(tabs)/feed' : '/(auth)/login');
      }
    })();
  }, []);

  useEffect(() => {
    if (destination) SplashScreen.hideAsync();
  }, [destination]);

  if (!destination) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: themeColors.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <HexLoader color={themeColors.primary} />
      </View>
    );
  }
  return <Redirect href={destination as Href} />;
}

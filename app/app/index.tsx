import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import type { Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { client } from '@/api/client';
import { tokenStorage } from '@/api/tokenStorage';

type Destination = '/(tabs)/feed' | '/(auth)/login' | '/(onboarding)';

export default function Index() {
  const [destination, setDestination] = useState<Destination | null>(null);

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
        setDestination(data.has_onboarded ? '/(tabs)/feed' : '/(onboarding)');
      } catch {
        setDestination('/(auth)/login');
      }
    })();
  }, []);

  useEffect(() => {
    if (destination) SplashScreen.hideAsync();
  }, [destination]);

  if (!destination) return null;
  return <Redirect href={destination as Href} />;
}

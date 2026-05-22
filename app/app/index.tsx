import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import type { Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { tokenStorage } from '@/api/tokenStorage';

type Destination = '/(tabs)/feed' | '/(auth)/login';

export default function Index() {
  const [destination, setDestination] = useState<Destination | null>(null);

  useEffect(() => {
    tokenStorage
      .getAccess()
      .then(token => setDestination(token ? '/(tabs)/feed' : '/(auth)/login'))
      .catch(() => setDestination('/(auth)/login'));
  }, []);

  useEffect(() => {
    if (destination) SplashScreen.hideAsync();
  }, [destination]);

  if (!destination) return null;
  return <Redirect href={destination as Href} />;
}

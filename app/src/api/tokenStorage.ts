import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'hm_access';
const REFRESH_KEY = 'hm_refresh';
const ONBOARDED_KEY = 'hm_onboarded';

export const tokenStorage = {
  getAccess: () => SecureStore.getItemAsync(ACCESS_KEY),
  getRefresh: () => SecureStore.getItemAsync(REFRESH_KEY),
  setTokens: (access: string, refresh: string) =>
    Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, access),
      SecureStore.setItemAsync(REFRESH_KEY, refresh),
    ]),
  clear: () =>
    Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
    ]),
  isOnboarded: () => SecureStore.getItemAsync(ONBOARDED_KEY).then(v => v === 'true'),
  setOnboarded: () => SecureStore.setItemAsync(ONBOARDED_KEY, 'true'),
};

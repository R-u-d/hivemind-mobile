import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'hm_access';
const REFRESH_KEY = 'hm_refresh';
const ONBOARDED_KEY = 'hm_onboarded';
const PUSH_TOKEN_KEY = 'hm_push_token';

const webStorage = {
  getItemAsync: async (key: string): Promise<string | null> => localStorage.getItem(key),
  setItemAsync: async (key: string, value: string): Promise<void> => {
    localStorage.setItem(key, value);
  },
  deleteItemAsync: async (key: string): Promise<void> => {
    localStorage.removeItem(key);
  },
};

const storage = Platform.OS === 'web' ? webStorage : SecureStore;

export const tokenStorage = {
  getAccess: () => storage.getItemAsync(ACCESS_KEY),
  getRefresh: () => storage.getItemAsync(REFRESH_KEY),
  setTokens: (access: string, refresh: string) =>
    Promise.all([
      storage.setItemAsync(ACCESS_KEY, access),
      storage.setItemAsync(REFRESH_KEY, refresh),
    ]),
  clear: () =>
    Promise.all([storage.deleteItemAsync(ACCESS_KEY), storage.deleteItemAsync(REFRESH_KEY)]),
  isOnboarded: () => storage.getItemAsync(ONBOARDED_KEY).then(v => v === 'true'),
  setOnboarded: () => storage.setItemAsync(ONBOARDED_KEY, 'true'),
  getPushToken: () => storage.getItemAsync(PUSH_TOKEN_KEY),
  setPushToken: (token: string) => storage.setItemAsync(PUSH_TOKEN_KEY, token),
  clearPushToken: () => storage.deleteItemAsync(PUSH_TOKEN_KEY),
};

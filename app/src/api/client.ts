import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { router, type Href } from 'expo-router';
import * as Sentry from '@sentry/react-native';

import { tokenStorage } from './tokenStorage';
import type { RefreshResponse } from '@/types/auth';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api';

export const client = axios.create({ baseURL: BASE_URL, timeout: 15000 });

// ── Request interceptor ───────────────────────────────────────────────────────

client.interceptors.request.use(async config => {
  if (!config.headers.Authorization) {
    try {
      const token = await tokenStorage.getAccess();
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch {
      // SecureStore unavailable — proceed without token
    }
  }
  return config;
});

// ── Refresh lock — prevents concurrent 401s from triggering multiple refreshes ─

let refreshing: Promise<string> | null = null;

// ── Response interceptor ──────────────────────────────────────────────────────

client.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const isAuthEndpoint =
      original.url?.includes('/auth/login/') ||
      original.url?.includes('/auth/register/') ||
      original.url?.includes('/auth/token/refresh/') ||
      original.url?.includes('/auth/logout/');

    if (error.response?.status !== 401 || original._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      if (!refreshing) {
        refreshing = (async () => {
          const refresh = await tokenStorage.getRefresh();
          if (!refresh) throw new Error('No refresh token');
          const { data } = await axios.post<RefreshResponse>(`${BASE_URL}/auth/token/refresh/`, {
            refresh,
          });
          await tokenStorage.setTokens(data.access, data.refresh ?? refresh);
          return data.access as string;
        })().finally(() => {
          refreshing = null;
        });
      }

      const newAccess = await refreshing;
      original.headers.Authorization = `Bearer ${newAccess}`;
      return client(original);
    } catch {
      Sentry.captureMessage('Token refresh failed', 'error');
      await tokenStorage.clear();
      router.replace('/(auth)/login' as Href);
      return Promise.reject(error);
    }
  },
);

// ── DRF error extractor ───────────────────────────────────────────────────────

export function extractDrfError(error: unknown): string {
  if (!axios.isAxiosError(error) || !error.response?.data) {
    return 'Something went wrong. Please try again.';
  }
  const data = error.response.data as Record<string, unknown>;
  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.non_field_errors) && typeof data.non_field_errors[0] === 'string') {
    return data.non_field_errors[0];
  }
  for (const value of Object.values(data)) {
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
    if (typeof value === 'object' && value !== null) {
      for (const nested of Object.values(value as Record<string, unknown>)) {
        if (Array.isArray(nested) && typeof nested[0] === 'string') return nested[0];
      }
    }
  }
  return 'Something went wrong. Please try again.';
}

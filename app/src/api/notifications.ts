import { client } from './client';

export const registerPushToken = (token: string, platform: 'ios' | 'android' | 'web') =>
  client.post('/push-tokens/', { token, platform });

export const deletePushToken = (token: string) =>
  client.delete('/push-tokens/', { data: { token } });

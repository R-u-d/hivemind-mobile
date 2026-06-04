import type { Href } from 'expo-router';

export function routeFromNotificationData(data: Record<string, unknown>): Href | null {
  if (typeof data.channel_id === 'string') {
    const base = `/channel/${data.channel_id}`;
    const query = typeof data.community_id === 'string' ? `?communityId=${data.community_id}` : '';
    return `${base}${query}` as Href;
  }
  if (typeof data.event_id === 'string') return `/event/${data.event_id}` as Href;
  if (typeof data.community_id === 'string') return `/community/${data.community_id}` as Href;
  return null;
}

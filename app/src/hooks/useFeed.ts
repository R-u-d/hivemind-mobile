import { useInfiniteQuery } from '@tanstack/react-query';

import { client } from '@/api/client';
import type { FeedPage } from '@/types/feed';

function extractCursor(next: string | null): string | undefined {
  if (!next) return undefined;
  try {
    const url = new URL(next);
    return url.searchParams.get('cursor') ?? undefined;
  } catch {
    return undefined;
  }
}

export function useFeed() {
  return useInfiniteQuery<FeedPage>({
    queryKey: ['feed'],
    queryFn: async ({ pageParam }) => {
      const params = pageParam ? { cursor: pageParam } : {};
      const res = await client.get<FeedPage>('/feed/', { params });
      return res.data;
    },
    getNextPageParam: page => extractCursor(page.next),
    initialPageParam: undefined,
  });
}

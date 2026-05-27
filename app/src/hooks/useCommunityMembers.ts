import { useInfiniteQuery } from '@tanstack/react-query';

import { client } from '@/api/client';
import type { MemberPage } from '@/types/community';

function extractCursor(nextUrl: string | null): string | null {
  if (!nextUrl) return null;
  try {
    return new URL(nextUrl).searchParams.get('cursor');
  } catch {
    return null;
  }
}

async function fetchMembers(communityId: string, cursor: string | null): Promise<MemberPage> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  const { data } = await client.get<MemberPage>(
    `/communities/${communityId}/members/?${params.toString()}`,
  );
  return data;
}

export function useCommunityMembers(communityId: string) {
  return useInfiniteQuery({
    queryKey: ['communities', communityId, 'members'],
    queryFn: ({ pageParam }) => fetchMembers(communityId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: last => extractCursor(last.next),
    retry: false,
  });
}

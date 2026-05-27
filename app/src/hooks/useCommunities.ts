import { useInfiniteQuery } from '@tanstack/react-query';

import { client } from '@/api/client';
import type { CommunityType } from '@/theme';
import type { CommunityPage } from '@/types/community';

export interface UseCommunitiesArgs {
  types?: CommunityType[];
  search?: string;
}

function buildPath(args: UseCommunitiesArgs, cursor: string | null): string {
  const params = new URLSearchParams();
  args.types?.forEach(t => params.append('type', t));
  if (args.search) params.set('search', args.search);
  if (cursor) params.set('cursor', cursor);
  return `/communities/?${params.toString()}`;
}

async function fetchPage(args: UseCommunitiesArgs, cursor: string | null): Promise<CommunityPage> {
  const { data } = await client.get<CommunityPage>(buildPath(args, cursor));
  return data;
}

function extractCursor(nextUrl: string | null): string | null {
  if (!nextUrl) return null;
  try {
    return new URL(nextUrl).searchParams.get('cursor');
  } catch {
    return null;
  }
}

export function useCommunities(args: UseCommunitiesArgs = {}) {
  return useInfiniteQuery({
    queryKey: ['communities', { types: args.types ?? [], search: args.search ?? '' }],
    queryFn: ({ pageParam }) => fetchPage(args, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: last => extractCursor(last.next),
    retry: false,
  });
}

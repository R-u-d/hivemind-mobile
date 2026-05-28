import { useInfiniteQuery } from '@tanstack/react-query';

import { client } from '@/api/client';
import type { EventPage, RsvpStatus } from '@/types/event';

export interface UseEventsArgs {
  rsvp?: Exclude<RsvpStatus, 'not_going'>;
  upcoming?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

function buildPath(args: UseEventsArgs, cursor: string | null): string {
  const params = new URLSearchParams();
  if (args.rsvp) params.set('rsvp', args.rsvp);
  params.set('upcoming', args.upcoming === false ? 'false' : 'true');
  if (args.dateFrom) params.set('date_from', args.dateFrom);
  if (args.dateTo) params.set('date_to', args.dateTo);
  if (cursor) params.set('cursor', cursor);
  return `/events/?${params.toString()}`;
}

async function fetchPage(args: UseEventsArgs, cursor: string | null): Promise<EventPage> {
  const { data } = await client.get<EventPage>(buildPath(args, cursor));
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

export function useEvents(args: UseEventsArgs = {}) {
  return useInfiniteQuery({
    queryKey: [
      'events',
      {
        rsvp: args.rsvp ?? null,
        upcoming: args.upcoming ?? true,
        dateFrom: args.dateFrom ?? null,
        dateTo: args.dateTo ?? null,
      },
    ],
    queryFn: ({ pageParam }) => fetchPage(args, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: last => extractCursor(last.next),
    retry: false,
  });
}

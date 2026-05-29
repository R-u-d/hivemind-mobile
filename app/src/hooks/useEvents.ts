import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { client } from '@/api/client';
import type { AttendeePage, Event, EventPage, RsvpStatus } from '@/types/event';

// ── List ─────────────────────────────────────────────────────────────────────

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

// ── Single event ──────────────────────────────────────────────────────────────

export function useEvent(id: string) {
  return useQuery({
    queryKey: ['events', id],
    queryFn: async () => {
      const { data } = await client.get<Event>(`/events/${id}/`);
      return data;
    },
    retry: false,
  });
}

// ── RSVP mutation ─────────────────────────────────────────────────────────────

interface RsvpVariables {
  eventId: string;
  status: RsvpStatus | null;
}

export function useRsvp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, status }: RsvpVariables) => {
      if (status === null) {
        await client.delete(`/events/${eventId}/rsvp/`);
        return null;
      }
      const { data } = await client.post(`/events/${eventId}/rsvp/`, { status });
      return data;
    },

    onMutate: async ({ eventId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['events', eventId] });
      const previous = queryClient.getQueryData<Event>(['events', eventId]);
      queryClient.setQueryData<Event>(['events', eventId], old =>
        old ? { ...old, rsvp_status: status } : old,
      );
      return { previous };
    },

    onError: (_err, { eventId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['events', eventId], context.previous);
      }
    },

    onSettled: (_data, _err, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

// ── Attendees ─────────────────────────────────────────────────────────────────

export function useEventAttendees(eventId: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: ['events', eventId, 'attendees'],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set('cursor', pageParam);
      const { data } = await client.get<AttendeePage>(
        `/events/${eventId}/attendees/?${params.toString()}`,
      );
      return data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: last => extractCursor(last.next),
    enabled,
    retry: false,
  });
}

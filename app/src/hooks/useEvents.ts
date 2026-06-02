import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { client } from '@/api/client';
import type { AttendeePage, Event, EventPage, RsvpStatus } from '@/types/event';

// ── List ─────────────────────────────────────────────────────────────────────

export interface UseEventsArgs {
  rsvp?: Exclude<RsvpStatus, 'not_going'>;
  upcoming?: boolean;
  dateFrom?: string;
  dateTo?: string;
  channel?: string;
  q?: string;
}

function buildPath(args: UseEventsArgs, cursor: string | null): string {
  const params = new URLSearchParams();
  if (args.rsvp) params.set('rsvp', args.rsvp);
  if (args.upcoming !== undefined) params.set('upcoming', args.upcoming ? 'true' : 'false');
  if (args.dateFrom) params.set('date_from', args.dateFrom);
  if (args.dateTo) params.set('date_to', args.dateTo);
  if (args.channel) params.set('channel', args.channel);
  if (args.q) params.set('q', args.q);
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

export function useEvents(args: UseEventsArgs = {}, enabled = true) {
  return useInfiniteQuery({
    queryKey: [
      'events',
      {
        rsvp: args.rsvp ?? null,
        upcoming: args.upcoming ?? null,
        dateFrom: args.dateFrom ?? null,
        dateTo: args.dateTo ?? null,
        channel: args.channel ?? null,
        q: args.q ?? null,
      },
    ],
    queryFn: ({ pageParam }) => fetchPage(args, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: last => extractCursor(last.next),
    enabled,
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

// ── Create event ────────────────────────────────────────────────────────────

export interface CreateEventPayload {
  community: string;
  channel?: string | null;
  title: string;
  description?: string;
  location_text?: string;
  lat?: number | null;
  lng?: number | null;
  start_datetime: string;
  end_datetime?: string | null;
  capacity?: number | null;
  is_private?: boolean;
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateEventPayload) => {
      const { data } = await client.post<Event>('/events/', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

// ── Cover upload ──────────────────────────────────────────────────────────────

interface PresignedUrlResponse {
  upload_url: string;
  public_url: string;
  key: string;
}

export function useEventCoverUpload() {
  return useMutation({
    mutationFn: async ({ localUri, eventId }: { localUri: string; eventId: string }) => {
      const blob = await (await fetch(localUri)).blob();
      const contentType = blob.type || 'image/jpeg';

      const { data: presigned } = await client.post<PresignedUrlResponse>(
        `/events/${eventId}/cover-upload-url/`,
        { content_type: contentType, file_size: blob.size },
      );

      await fetch(presigned.upload_url, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': contentType },
      });
      return presigned.public_url;
    },
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
      queryClient.invalidateQueries({ queryKey: ['feed'] });
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

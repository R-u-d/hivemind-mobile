import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { client } from '@/api/client';
import type { AppNotification, NotificationPage } from '@/types/notifications';

function extractCursor(next: string | null): string | undefined {
  if (!next) return undefined;
  try {
    return new URL(next).searchParams.get('cursor') ?? undefined;
  } catch {
    return undefined;
  }
}

export function useNotifications() {
  const query = useInfiniteQuery<NotificationPage>({
    queryKey: ['notifications'],
    queryFn: async ({ pageParam }) => {
      const params = pageParam ? { cursor: pageParam } : {};
      const { data } = await client.get<NotificationPage>('/notifications/', { params });
      return data;
    },
    getNextPageParam: page => extractCursor(page.next),
    initialPageParam: undefined,
  });

  const notifications = query.data?.pages.flatMap(p => p.results) ?? [];
  const hasUnread = notifications.some(n => !n.is_read);

  return { ...query, notifications, hasUnread };
}

export function useMarkRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => client.post(`/notifications/${id}/read/`),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previous = queryClient.getQueryData(['notifications']);

      queryClient.setQueryData(
        ['notifications'],
        (old: { pages: NotificationPage[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map(page => ({
              ...page,
              results: page.results.map(n => (n.id === id ? { ...n, is_read: true } : n)),
            })),
          };
        },
      );

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['notifications'], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkUnread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => client.post(`/notifications/${id}/unread/`),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previous = queryClient.getQueryData(['notifications']);

      queryClient.setQueryData(
        ['notifications'],
        (old: { pages: NotificationPage[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map(page => ({
              ...page,
              results: page.results.map(n => (n.id === id ? { ...n, is_read: false } : n)),
            })),
          };
        },
      );

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['notifications'], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => client.post('/notifications/read_all/'),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previous = queryClient.getQueryData(['notifications']);

      queryClient.setQueryData(
        ['notifications'],
        (old: { pages: NotificationPage[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map(page => ({
              ...page,
              results: page.results.map((n: AppNotification) => ({ ...n, is_read: true })),
            })),
          };
        },
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['notifications'], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

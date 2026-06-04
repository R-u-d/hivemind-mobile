import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

import { client } from '@/api/client';
import { useMarkAllRead, useMarkRead, useNotifications } from '@/hooks/useNotifications';
import type { AppNotification, NotificationPage } from '@/types/notifications';

jest.mock('@/api/client', () => ({
  client: { get: jest.fn(), post: jest.fn() },
}));

const mockClient = client as jest.Mocked<typeof client>;

const makeNotification = (overrides: Partial<AppNotification> = {}): AppNotification => ({
  id: 'n-1',
  notification_type: 'new_post',
  title: 'New post in Test Community',
  body: 'Hello world',
  data: { channel_id: 'ch-1', community_id: 'com-1' },
  is_read: false,
  created_at: '2026-06-01T10:00:00Z',
  ...overrides,
});

const emptyPage: NotificationPage = { results: [], next: null, previous: null };

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => jest.clearAllMocks());

// ── useNotifications ──────────────────────────────────────────────────────────

describe('useNotifications', () => {
  it('fetches /notifications/ and exposes the results', async () => {
    const notif = makeNotification();
    mockClient.get.mockResolvedValue({ data: { results: [notif], next: null, previous: null } });

    const { result } = renderHook(() => useNotifications(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockClient.get).toHaveBeenCalledWith('/notifications/', { params: {} });
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].id).toBe('n-1');
  });

  it('derives hasUnread=true when any notification is unread', async () => {
    mockClient.get.mockResolvedValue({
      data: {
        results: [
          makeNotification({ is_read: false }),
          makeNotification({ id: 'n-2', is_read: true }),
        ],
        next: null,
        previous: null,
      },
    });

    const { result } = renderHook(() => useNotifications(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasUnread).toBe(true);
  });

  it('derives hasUnread=false when all notifications are read', async () => {
    mockClient.get.mockResolvedValue({
      data: { results: [makeNotification({ is_read: true })], next: null, previous: null },
    });

    const { result } = renderHook(() => useNotifications(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasUnread).toBe(false);
  });

  it('returns empty array when the page is empty', async () => {
    mockClient.get.mockResolvedValue({ data: emptyPage });

    const { result } = renderHook(() => useNotifications(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.notifications).toHaveLength(0);
    expect(result.current.hasUnread).toBe(false);
  });
});

// ── useMarkRead ───────────────────────────────────────────────────────────────

describe('useMarkRead', () => {
  function setup() {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const notif = makeNotification({ is_read: false });
    qc.setQueryData(['notifications'], {
      pages: [{ results: [notif], next: null, previous: null }],
      pageParams: [undefined],
    });

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children);

    return { qc, wrapper };
  }

  it('optimistically sets is_read=true before the server responds', async () => {
    mockClient.post.mockReturnValue(new Promise(() => {})); // never resolves
    const { qc, wrapper } = setup();

    const { result } = renderHook(() => useMarkRead(), { wrapper });

    act(() => result.current.mutate('n-1'));

    // onMutate is async (cancelQueries + setQueryData) — wait for the cache to reflect it.
    await waitFor(() => {
      const cached = qc.getQueryData<{ pages: NotificationPage[] }>(['notifications']);
      expect(cached?.pages[0].results[0].is_read).toBe(true);
    });
  });

  it('rolls back is_read on server error', async () => {
    mockClient.post.mockRejectedValue(new Error('Server error'));
    const { qc, wrapper } = setup();

    const { result } = renderHook(() => useMarkRead(), { wrapper });

    act(() => result.current.mutate('n-1'));

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = qc.getQueryData<{ pages: NotificationPage[] }>(['notifications']);
    expect(cached?.pages[0].results[0].is_read).toBe(false);
  });

  it('calls POST /notifications/<id>/read/ with the correct id', async () => {
    mockClient.post.mockResolvedValue({ data: {} });
    const { wrapper } = setup();

    const { result } = renderHook(() => useMarkRead(), { wrapper });

    act(() => result.current.mutate('n-1'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockClient.post).toHaveBeenCalledWith('/notifications/n-1/read/');
  });
});

// ── useMarkAllRead ────────────────────────────────────────────────────────────

describe('useMarkAllRead', () => {
  function setup() {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const notifications = [
      makeNotification({ id: 'n-1', is_read: false }),
      makeNotification({ id: 'n-2', is_read: false }),
    ];
    qc.setQueryData(['notifications'], {
      pages: [{ results: notifications, next: null, previous: null }],
      pageParams: [undefined],
    });

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children);

    return { qc, wrapper };
  }

  it('optimistically marks all notifications as read', async () => {
    mockClient.post.mockReturnValue(new Promise(() => {}));
    const { qc, wrapper } = setup();

    const { result } = renderHook(() => useMarkAllRead(), { wrapper });

    act(() => result.current.mutate());

    await waitFor(() => {
      const cached = qc.getQueryData<{ pages: NotificationPage[] }>(['notifications']);
      expect(cached?.pages[0].results.every(n => n.is_read)).toBe(true);
    });
  });

  it('rolls back all notifications on server error', async () => {
    mockClient.post.mockRejectedValue(new Error('Server error'));
    const { qc, wrapper } = setup();

    const { result } = renderHook(() => useMarkAllRead(), { wrapper });

    act(() => result.current.mutate());

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = qc.getQueryData<{ pages: NotificationPage[] }>(['notifications']);
    expect(cached?.pages[0].results.every(n => !n.is_read)).toBe(true);
  });

  it('calls POST /notifications/read_all/', async () => {
    mockClient.post.mockResolvedValue({ data: { updated: 2 } });
    const { wrapper } = setup();

    const { result } = renderHook(() => useMarkAllRead(), { wrapper });

    act(() => result.current.mutate());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockClient.post).toHaveBeenCalledWith('/notifications/read_all/');
  });
});

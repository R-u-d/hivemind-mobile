import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

import { client } from '@/api/client';
import { useChannelPosts, useCreatePost, useDeletePost } from '@/hooks/useChannelPosts';
import type { Post, PostPage } from '@/types/community';

jest.mock('@/api/client', () => ({
  client: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

const mockClient = client as jest.Mocked<typeof client>;

const CHANNEL_ID = 'ch-111';

const makePost = (id: string, body = 'Hello'): Post => ({
  id,
  channel: CHANNEL_ID,
  author: { id: 'user-1', display_name: 'Alice', avatar_url: null },
  body,
  created_at: new Date().toISOString(),
});

const makePage = (results: Post[], next: string | null = null): PostPage => ({
  next,
  previous: null,
  results,
});

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    qc,
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children),
  };
}

beforeEach(() => jest.clearAllMocks());

describe('useChannelPosts', () => {
  it('fetches first page and exposes results', async () => {
    const page = makePage([makePost('p1'), makePost('p2')]);
    mockClient.get.mockResolvedValue({ data: page });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useChannelPosts(CHANNEL_ID, true), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const posts = result.current.data?.pages.flatMap(p => p.results) ?? [];
    expect(posts).toHaveLength(2);
    expect(posts[0].id).toBe('p1');
    expect(mockClient.get).toHaveBeenCalledWith(`/channels/${CHANNEL_ID}/posts/`, { params: {} });
  });

  it('exposes error state when fetch fails', async () => {
    mockClient.get.mockRejectedValue(new Error('500'));
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useChannelPosts(CHANNEL_ID, true), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useCreatePost', () => {
  it('optimistically inserts a post then replaces it with server response', async () => {
    const existing = makePost('p-existing');
    const serverPost = makePost('p-server', 'New post');
    const page = makePage([existing]);

    mockClient.get.mockResolvedValue({ data: page });
    mockClient.post.mockResolvedValue({ data: serverPost });

    const currentUser = { id: 'user-1', display_name: 'Alice', avatar_url: null };
    const { wrapper, qc } = makeWrapper();

    // Prime the posts cache
    const { result: postsResult } = renderHook(() => useChannelPosts(CHANNEL_ID, true), {
      wrapper,
    });
    await waitFor(() => expect(postsResult.current.isSuccess).toBe(true));

    const { result: createResult } = renderHook(() => useCreatePost(CHANNEL_ID, currentUser), {
      wrapper,
    });

    act(() => {
      createResult.current.mutate({ body: 'New post' });
    });

    // Optimistic post present before server responds
    await waitFor(() => {
      const posts =
        qc
          .getQueryData<{ pages: PostPage[] }>(['channels', CHANNEL_ID, 'posts'])
          ?.pages.flatMap(p => p.results) ?? [];
      expect(posts.some(p => p.body === 'New post')).toBe(true);
    });

    // After server responds, tempId is replaced with server id
    await waitFor(() => expect(createResult.current.isSuccess).toBe(true));
    const finalPosts =
      qc
        .getQueryData<{ pages: PostPage[] }>(['channels', CHANNEL_ID, 'posts'])
        ?.pages.flatMap(p => p.results) ?? [];
    expect(finalPosts.some(p => p.id === 'p-server')).toBe(true);
    expect(finalPosts.every(p => !p.id.startsWith('temp-'))).toBe(true);
  });
});

describe('useDeletePost', () => {
  it('optimistically removes the post from cache', async () => {
    const post = makePost('p-to-delete');
    const page = makePage([post]);
    const emptyPage = makePage([]);

    // First call: return page with post (initial fetch)
    // Second call: return empty page (refetch after delete)
    mockClient.get.mockResolvedValueOnce({ data: page }).mockResolvedValueOnce({ data: emptyPage });
    mockClient.delete.mockResolvedValue({ data: {} });

    const { wrapper, qc } = makeWrapper();

    const { result: postsResult } = renderHook(() => useChannelPosts(CHANNEL_ID, true), {
      wrapper,
    });
    await waitFor(() => expect(postsResult.current.isSuccess).toBe(true));

    const { result: deleteResult } = renderHook(() => useDeletePost(CHANNEL_ID), { wrapper });

    act(() => {
      deleteResult.current.mutate('p-to-delete');
    });

    await waitFor(() => {
      const posts =
        qc
          .getQueryData<{ pages: PostPage[] }>(['channels', CHANNEL_ID, 'posts'])
          ?.pages.flatMap(p => p.results) ?? [];
      expect(posts.every(p => p.id !== 'p-to-delete')).toBe(true);
    });
  });
});

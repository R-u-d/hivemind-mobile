import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';

import { client } from '@/api/client';
import type { Post, PostPage, PostAuthor } from '@/types/community';

// ── Fetcher ───────────────────────────────────────────────────────────────────

async function fetchPosts(channelId: string, cursor?: string): Promise<PostPage> {
  const params: Record<string, string> = {};
  if (cursor) params.cursor = cursor;
  const { data } = await client.get<PostPage>(`/channels/${channelId}/posts/`, { params });
  return data;
}

// ── Posts query ───────────────────────────────────────────────────────────────

export function useChannelPosts(channelId: string, isFocused: boolean) {
  return useInfiniteQuery({
    queryKey: ['channels', channelId, 'posts'],
    queryFn: ({ pageParam }) => fetchPosts(channelId, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => lastPage.next ?? undefined,
    refetchInterval: isFocused ? 30_000 : false,
    refetchIntervalInBackground: false,
  });
}

// ── Create post ───────────────────────────────────────────────────────────────

interface CreatePostVars {
  body: string;
}

export function useCreatePost(channelId: string, currentUser: PostAuthor | null) {
  const queryClient = useQueryClient();
  const queryKey = ['channels', channelId, 'posts'];

  return useMutation({
    mutationFn: ({ body }: CreatePostVars) =>
      client.post<Post>(`/channels/${channelId}/posts/`, { body }).then(r => r.data),

    onMutate: async ({ body }) => {
      if (!currentUser) return {};
      await queryClient.cancelQueries({ queryKey });
      const snapshot = queryClient.getQueryData<InfiniteData<PostPage>>(queryKey);

      const tempId = `temp-${Date.now()}`;
      const tempPost: Post = {
        id: tempId,
        channel: channelId,
        author: {
          id: currentUser?.id ?? '',
          display_name: currentUser?.display_name ?? '',
          avatar_url: currentUser?.avatar_url ?? null,
        },
        body,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<InfiniteData<PostPage>>(queryKey, old => {
        if (!old) return old;
        const firstPage =
          old.pages.length > 0
            ? { ...old.pages[0], results: [tempPost, ...old.pages[0].results] }
            : { next: null, previous: null, results: [tempPost] };
        return {
          ...old,
          pages: [firstPage, ...old.pages.slice(1)],
        };
      });

      return { snapshot, tempId };
    },

    onSuccess: (serverPost, _vars, context) => {
      if (!context?.tempId) {
        queryClient.invalidateQueries({ queryKey });
        return;
      }
      queryClient.setQueryData<InfiniteData<PostPage>>(queryKey, old => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            results: page.results.map(p => (p.id === context.tempId ? serverPost : p)),
          })),
        };
      });
    },

    onError: (_err, _vars, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(queryKey, context.snapshot);
      }
    },
  });
}

// ── Delete post ───────────────────────────────────────────────────────────────

export function useDeletePost(channelId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['channels', channelId, 'posts'];

  return useMutation({
    mutationFn: (postId: string) => client.delete(`/channels/${channelId}/posts/${postId}/`),

    onMutate: async (postId: string) => {
      await queryClient.cancelQueries({ queryKey });
      const snapshot = queryClient.getQueryData<InfiniteData<PostPage>>(queryKey);

      queryClient.setQueryData<InfiniteData<PostPage>>(queryKey, old => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            results: page.results.filter(p => p.id !== postId),
          })),
        };
      });

      return { snapshot };
    },

    onError: (_err, _vars, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(queryKey, context.snapshot);
      }
    },
  });
}

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

import { client } from '@/api/client';
import { useUpdateProfile } from '@/hooks/useUpdateProfile';
import type { User } from '@/types/user';

jest.mock('@/api/client', () => ({
  client: { patch: jest.fn() },
}));

const mockClient = client as jest.Mocked<typeof client>;

const existingUser: User = {
  id: 'user-1',
  email: 'maya@test.com',
  display_name: 'Maya',
  bio: 'old bio',
  location: null,
  avatar_url: null,
  has_onboarded: false,
  created_at: '2026-01-01T00:00:00Z',
  event_count: 0,
};

function makeWrapper(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

function newQueryClient() {
  return new QueryClient({ defaultOptions: { mutations: { retry: false } } });
}

beforeEach(() => jest.clearAllMocks());

it('PATCHes /users/me/ and writes the response into the cache on success', async () => {
  const updated: User = { ...existingUser, display_name: 'Maya O.' };
  mockClient.patch.mockResolvedValue({ data: updated });

  const qc = newQueryClient();
  qc.setQueryData(['users', 'me'], existingUser);
  const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');

  const { result } = renderHook(() => useUpdateProfile(), { wrapper: makeWrapper(qc) });

  act(() => result.current.mutate({ display_name: 'Maya O.' }));

  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  expect(mockClient.patch).toHaveBeenCalledWith('/users/me/', { display_name: 'Maya O.' });
  expect(qc.getQueryData(['users', 'me'])).toEqual(updated);
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['users', existingUser.id] });
});

it('optimistically updates the cache before the request resolves', async () => {
  let resolvePatch: (value: { data: User }) => void = () => {};
  mockClient.patch.mockReturnValue(
    new Promise(resolve => {
      resolvePatch = resolve;
    }),
  );

  const qc = newQueryClient();
  qc.setQueryData(['users', 'me'], existingUser);

  const { result } = renderHook(() => useUpdateProfile(), { wrapper: makeWrapper(qc) });

  act(() => result.current.mutate({ bio: 'new bio' }));

  await waitFor(() => expect(qc.getQueryData<User>(['users', 'me'])?.bio).toBe('new bio'));

  await act(async () => {
    resolvePatch({ data: { ...existingUser, bio: 'new bio' } });
  });
});

it('rolls back the cache to the previous value on error', async () => {
  mockClient.patch.mockRejectedValue(new Error('Server error'));

  const qc = newQueryClient();
  qc.setQueryData(['users', 'me'], existingUser);

  const { result } = renderHook(() => useUpdateProfile(), { wrapper: makeWrapper(qc) });

  act(() => result.current.mutate({ bio: 'doomed edit' }));

  await waitFor(() => expect(result.current.isError).toBe(true));

  expect(qc.getQueryData(['users', 'me'])).toEqual(existingUser);
});

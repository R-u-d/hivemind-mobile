import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

import { client } from '@/api/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { User } from '@/types/user';

jest.mock('@/api/client', () => ({
  client: { get: jest.fn() },
}));

const mockClient = client as jest.Mocked<typeof client>;

const user: User = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  display_name: 'Test User',
  bio: null,
  location: null,
  avatar_url: null,
  created_at: '2026-01-01T00:00:00Z',
};

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function makeWrapper(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => jest.clearAllMocks());

it('returns user data from GET /users/me/ and caches under [users, me]', async () => {
  mockClient.get.mockResolvedValue({ data: user });

  const qc = makeQueryClient();
  const { result } = renderHook(() => useCurrentUser(), { wrapper: makeWrapper(qc) });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  expect(result.current.data).toEqual(user);
  expect(mockClient.get).toHaveBeenCalledWith('/users/me/');
  expect(qc.getQueryData(['users', 'me'])).toEqual(user);
});

it('exposes error state when the request fails', async () => {
  mockClient.get.mockRejectedValue(new Error('Network error'));

  const qc = makeQueryClient();
  const { result } = renderHook(() => useCurrentUser(), { wrapper: makeWrapper(qc) });

  await waitFor(() => expect(result.current.isError).toBe(true));

  expect(result.current.data).toBeUndefined();
});

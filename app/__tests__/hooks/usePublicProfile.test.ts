import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

import { client } from '@/api/client';
import { usePublicProfile } from '@/hooks/usePublicProfile';
import type { User } from '@/types/user';

jest.mock('@/api/client', () => ({
  client: { get: jest.fn() },
}));

const mockClient = client as jest.Mocked<typeof client>;

const publicUser: User = {
  id: 'user-9',
  email: 'pat@test.com',
  display_name: 'Pat',
  bio: null,
  location: null,
  avatar_url: null,
  has_onboarded: false,
  created_at: '2026-01-01T00:00:00Z',
  event_count: 0,
};

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => jest.clearAllMocks());

it('GETs /users/<id>/ and returns the profile', async () => {
  mockClient.get.mockResolvedValue({ data: publicUser });

  const { result } = renderHook(() => usePublicProfile('user-9'), { wrapper: makeWrapper() });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  expect(mockClient.get).toHaveBeenCalledWith('/users/user-9/');
  expect(result.current.data).toEqual(publicUser);
});

it('stays disabled and does not fetch when id is empty', async () => {
  const { result } = renderHook(() => usePublicProfile(''), { wrapper: makeWrapper() });

  expect(result.current.fetchStatus).toBe('idle');
  expect(mockClient.get).not.toHaveBeenCalled();
});

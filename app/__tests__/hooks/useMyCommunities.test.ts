import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

import { client } from '@/api/client';
import { useMyCommunities } from '@/hooks/useMyCommunities';
import type { Community } from '@/types/community';

jest.mock('@/api/client', () => ({
  client: { get: jest.fn() },
}));

const mockClient = client as jest.Mocked<typeof client>;

const communities: Community[] = [
  {
    id: 'c-1',
    name: 'Chess Club',
    type: 'creative',
    member_count: 12,
    created_at: '2026-01-01T00:00:00Z',
  },
];

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => jest.clearAllMocks());

it('GETs /users/me/communities/ and returns the list', async () => {
  mockClient.get.mockResolvedValue({ data: communities });

  const { result } = renderHook(() => useMyCommunities(), { wrapper: makeWrapper() });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  expect(mockClient.get).toHaveBeenCalledWith('/users/me/communities/');
  expect(result.current.data).toEqual(communities);
});

it('exposes error state when the endpoint fails', async () => {
  mockClient.get.mockRejectedValue(new Error('404'));

  const { result } = renderHook(() => useMyCommunities(), { wrapper: makeWrapper() });

  await waitFor(() => expect(result.current.isError).toBe(true));
});

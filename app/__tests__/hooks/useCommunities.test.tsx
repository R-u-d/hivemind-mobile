import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { createElement, type ReactNode } from 'react';

import { client } from '@/api/client';
import { useCommunities } from '@/hooks/useCommunities';

jest.mock('@/api/client', () => ({
  client: { get: jest.fn() },
}));

const mockedClient = client as jest.Mocked<typeof client>;

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

const samplePage = (overrides: Partial<{ next: string | null; results: unknown[] }> = {}) => ({
  next: null,
  previous: null,
  results: [],
  ...overrides,
});

describe('useCommunities', () => {
  beforeEach(() => {
    mockedClient.get.mockReset();
  });

  it('fetches the first page with no params when args are empty', async () => {
    mockedClient.get.mockResolvedValueOnce({ data: samplePage() } as never);
    const { result } = renderHook(() => useCommunities(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedClient.get).toHaveBeenCalledWith('/communities/?');
  });

  it('includes type params when types provided', async () => {
    mockedClient.get.mockResolvedValueOnce({ data: samplePage() } as never);
    const { result } = renderHook(() => useCommunities({ types: ['gaming', 'study'] }), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedClient.get).toHaveBeenCalledWith('/communities/?type=gaming&type=study');
  });

  it('includes search param when provided', async () => {
    mockedClient.get.mockResolvedValueOnce({ data: samplePage() } as never);
    const { result } = renderHook(() => useCommunities({ search: 'linocut' }), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedClient.get).toHaveBeenCalledWith('/communities/?search=linocut');
  });

  it('fetches next page using the cursor from previous page', async () => {
    mockedClient.get
      .mockResolvedValueOnce({
        data: samplePage({ next: 'http://x/api/communities/?cursor=ABC' }),
      } as never)
      .mockResolvedValueOnce({ data: samplePage() } as never);

    const { result } = renderHook(() => useCommunities(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await result.current.fetchNextPage();
    await waitFor(() => expect(mockedClient.get).toHaveBeenCalledTimes(2));
    expect(mockedClient.get).toHaveBeenLastCalledWith('/communities/?cursor=ABC');
  });
});

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

import { client } from '@/api/client';
import { tokenStorage } from '@/api/tokenStorage';
import { useLogin } from '@/hooks/useLogin';

jest.mock('@/api/client', () => ({
  client: { post: jest.fn() },
  extractDrfError: jest.fn((e: unknown) => (e instanceof Error ? e.message : 'Error')),
}));

jest.mock('@/api/tokenStorage', () => ({
  tokenStorage: { setTokens: jest.fn().mockResolvedValue(undefined) },
}));

const mockClient = client as jest.Mocked<typeof client>;
const mockStorage = tokenStorage as jest.Mocked<typeof tokenStorage>;

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => jest.clearAllMocks());

it('calls POST /auth/login/ and stores tokens on success', async () => {
  mockClient.post.mockResolvedValue({ data: { access: 'acc123', refresh: 'ref456' } });

  const { result } = renderHook(() => useLogin(), { wrapper: makeWrapper() });

  act(() => result.current.mutate({ email: 'user@test.com', password: 'pass1234' }));

  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  expect(mockClient.post).toHaveBeenCalledWith('/auth/login/', {
    email: 'user@test.com',
    password: 'pass1234',
  });
  expect(mockStorage.setTokens).toHaveBeenCalledWith('acc123', 'ref456');
});

it('exposes error state when the request fails', async () => {
  mockClient.post.mockRejectedValue(new Error('Invalid credentials'));

  const { result } = renderHook(() => useLogin(), { wrapper: makeWrapper() });

  act(() => result.current.mutate({ email: 'user@test.com', password: 'wrong' }));

  await waitFor(() => expect(result.current.isError).toBe(true));

  expect(mockStorage.setTokens).not.toHaveBeenCalled();
});

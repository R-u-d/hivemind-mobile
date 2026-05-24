import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

import { client } from '@/api/client';
import { tokenStorage } from '@/api/tokenStorage';
import { useRegister } from '@/hooks/useRegister';
import type { User } from '@/types/user';

jest.mock('@/api/client', () => ({
  client: { post: jest.fn() },
  extractDrfError: jest.fn((e: unknown) => (e instanceof Error ? e.message : 'Error')),
}));

jest.mock('@/api/tokenStorage', () => ({
  tokenStorage: { setTokens: jest.fn().mockResolvedValue(undefined) },
}));

const mockClient = client as jest.Mocked<typeof client>;
const mockStorage = tokenStorage as jest.Mocked<typeof tokenStorage>;

const user: User = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'maya@example.com',
  display_name: 'Maya',
  bio: null,
  location: null,
  avatar_url: null,
  has_onboarded: false,
  created_at: '2026-01-01T00:00:00Z',
};

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => jest.clearAllMocks());

it('calls POST /auth/register/ with correct payload and stores tokens on success', async () => {
  mockClient.post.mockResolvedValue({ data: { user, access: 'acc123', refresh: 'ref456' } });

  const { result } = renderHook(() => useRegister(), { wrapper: makeWrapper() });

  act(() =>
    result.current.mutate({
      display_name: 'Maya',
      email: 'maya@example.com',
      password: 'SecurePass1!',
    }),
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  expect(mockClient.post).toHaveBeenCalledWith('/auth/register/', {
    display_name: 'Maya',
    email: 'maya@example.com',
    password: 'SecurePass1!',
  });
  expect(mockStorage.setTokens).toHaveBeenCalledWith('acc123', 'ref456');
  expect(result.current.data?.user).toEqual(user);
});

it('exposes error state when registration fails', async () => {
  mockClient.post.mockRejectedValue(new Error('Email already exists'));

  const { result } = renderHook(() => useRegister(), { wrapper: makeWrapper() });

  act(() =>
    result.current.mutate({
      display_name: 'Maya',
      email: 'existing@example.com',
      password: 'SecurePass1!',
    }),
  );

  await waitFor(() => expect(result.current.isError).toBe(true));

  expect(mockStorage.setTokens).not.toHaveBeenCalled();
});

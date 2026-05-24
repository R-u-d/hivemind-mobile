import { useMutation } from '@tanstack/react-query';

import { client } from '@/api/client';
import { tokenStorage } from '@/api/tokenStorage';
import type { LoginRequest, LoginResponse } from '@/types/auth';
import type { User } from '@/types/user';

async function login(data: LoginRequest): Promise<{ tokens: LoginResponse; user: User }> {
  const { data: tokens } = await client.post<LoginResponse>('/auth/login/', data);
  await tokenStorage.setTokens(tokens.access, tokens.refresh);
  const { data: user } = await client.get<User>('/users/me/');
  if (user.has_onboarded) await tokenStorage.setOnboarded();
  return { tokens, user };
}

export function useLogin() {
  return useMutation({ mutationFn: login });
}

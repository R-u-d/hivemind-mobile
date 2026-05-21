import { useMutation } from '@tanstack/react-query';

import { client } from '@/api/client';
import { tokenStorage } from '@/api/tokenStorage';
import type { LoginRequest, LoginResponse } from '@/types/auth';

async function login(data: LoginRequest): Promise<LoginResponse> {
  const { data: res } = await client.post<LoginResponse>('/auth/login/', data);
  return res;
}

export function useLogin() {
  return useMutation({
    mutationFn: login,
    onSuccess: async ({ access, refresh }) => {
      await tokenStorage.setTokens(access, refresh);
    },
  });
}

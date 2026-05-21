import { useMutation } from '@tanstack/react-query';

import { client } from '@/api/client';
import { tokenStorage } from '@/api/tokenStorage';
import type { RegisterRequest, RegisterResponse } from '@/types/auth';

async function register(data: RegisterRequest): Promise<RegisterResponse> {
  const { data: res } = await client.post<RegisterResponse>('/auth/register/', data);
  return res;
}

export function useRegister() {
  return useMutation({
    mutationFn: register,
    onSuccess: async ({ access, refresh }) => {
      await tokenStorage.setTokens(access, refresh);
    },
  });
}

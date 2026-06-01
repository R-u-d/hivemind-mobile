import { useMutation } from '@tanstack/react-query';

import { client } from '@/api/client';
import type { ForgotPasswordRequest } from '@/types/auth';

async function forgotPassword(data: ForgotPasswordRequest): Promise<void> {
  await client.post('/auth/forgot-password/', data);
}

export function useForgotPassword() {
  return useMutation({ mutationFn: forgotPassword });
}

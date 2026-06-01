import { useMutation } from '@tanstack/react-query';

import { client } from '@/api/client';
import type { ResetPasswordRequest } from '@/types/auth';

async function resetPassword(data: ResetPasswordRequest): Promise<void> {
  await client.post('/auth/reset-password/', data);
}

export function useResetPassword() {
  return useMutation({ mutationFn: resetPassword });
}

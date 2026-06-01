import { useMutation } from '@tanstack/react-query';
import { client } from '@/api/client';
import type { VerifyResetCodeRequest } from '@/types/auth';

async function verifyResetCode(data: VerifyResetCodeRequest): Promise<void> {
  await client.post('/auth/verify-reset-code/', data);
}

export function useVerifyResetCode() {
  return useMutation({ mutationFn: verifyResetCode });
}

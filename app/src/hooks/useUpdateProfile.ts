import { useMutation, useQueryClient } from '@tanstack/react-query';

import { client } from '@/api/client';
import type { User } from '@/types/user';

interface UpdateProfilePayload {
  display_name?: string;
  bio?: string;
  location?: string;
  avatar_url?: string;
}

async function updateProfile(payload: UpdateProfilePayload): Promise<User> {
  const { data } = await client.patch<User>('/users/me/', payload);
  return data;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfile,
    onMutate: async payload => {
      await queryClient.cancelQueries({ queryKey: ['users', 'me'] });
      const previous = queryClient.getQueryData<User>(['users', 'me']);
      if (previous) {
        queryClient.setQueryData<User>(['users', 'me'], { ...previous, ...payload });
      }
      return { previous };
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['users', 'me'], context.previous);
      }
    },
    onSuccess: user => {
      queryClient.setQueryData(['users', 'me'], user);
      queryClient.invalidateQueries({ queryKey: ['users', user.id] });
    },
  });
}

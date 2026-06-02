import { AppState, type AppStateStatus } from 'react-native';
import { QueryClient, focusManager } from '@tanstack/react-query';

// Tell TanStack Query to treat app foreground transitions as a focus event,
// enabling refetchOnWindowFocus to work on React Native.
AppState.addEventListener('change', (status: AppStateStatus) => {
  focusManager.setFocused(status === 'active');
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 2,
      retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30_000),
    },
  },
});

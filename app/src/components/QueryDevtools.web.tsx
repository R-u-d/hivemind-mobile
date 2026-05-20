import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export default function QueryDevtools() {
  if (!__DEV__) return null;
  return <ReactQueryDevtools initialIsOpen={false} />;
}

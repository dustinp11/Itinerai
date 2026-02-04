import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: Infinity, // Never garbage collect - keep cache in memory
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Don't refetch on component mount if data exists
      refetchOnReconnect: false, // Don't refetch on network reconnection
    },
  },
});

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export { queryClient };
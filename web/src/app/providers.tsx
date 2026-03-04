'use client';

import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { TimeRangeProvider } from '@/contexts/TimeRangeContext';
import { ApiErrorBoundary } from '@/components/ApiErrorBoundary';
import { ApiError } from '@/lib/api';

function ApiErrorBoundaryWithClient({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  return (
    <ApiErrorBoundary onRetry={() => queryClient.invalidateQueries()}>
      {children}
    </ApiErrorBoundary>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              if (error instanceof ApiError && error.status >= 500) {
                return failureCount < 2;
              }
              if (error instanceof ApiError && error.status === 408) {
                return failureCount < 2;
              }
              return false;
            },
            throwOnError: true,
          },
        },
      })
  );
  return (
    <QueryClientProvider client={client}>
      <TimeRangeProvider>
        <ApiErrorBoundaryWithClient>{children}</ApiErrorBoundaryWithClient>
      </TimeRangeProvider>
    </QueryClientProvider>
  );
}

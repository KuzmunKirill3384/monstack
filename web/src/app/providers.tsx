'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { TimeRangeProvider } from '@/contexts/TimeRangeContext';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <TimeRangeProvider>{children}</TimeRangeProvider>
    </QueryClientProvider>
  );
}

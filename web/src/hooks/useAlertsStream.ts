'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export function useAlertsStream(enabled: boolean) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    const url = `${API_BASE}/alerts/stream`;
    const es = new EventSource(url, { withCredentials: true });
    es.onmessage = () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [enabled, queryClient]);
}

'use client';

import { useEffect, useState } from 'react';
import { getToken } from '@/lib/auth';

export function useAuth() {
  const [token] = useState<string | null>(() =>
    typeof window !== 'undefined' ? getToken() : null
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  return { token, isAuthenticated: !!token, mounted };
}

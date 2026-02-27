'use client';

import { useEffect, useState } from 'react';
import { getToken } from '@/lib/auth';

export function useAuth() {
  const [token, setTokenState] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTokenState(getToken());
    setMounted(true);
  }, []);

  return { token, isAuthenticated: !!token, mounted };
}

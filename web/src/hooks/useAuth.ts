'use client';

import { useCallback, useEffect, useState } from 'react';
import { getMe, logout as logoutApi } from '@/lib/auth';

export function useAuth() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const refresh = useCallback(async () => {
    const me = await getMe();
    setUser(me);
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const t = setTimeout(() => refresh(), 0);
    return () => clearTimeout(t);
  }, [mounted, refresh]);

  const logout = useCallback(async () => {
    await logoutApi();
    setUser(null);
  }, []);

  const isAnonymous =
    user?.id === 'anonymous' || user?.email === 'anonymous';

  return {
    user,
    isAuthenticated: !!user,
    isAnonymous,
    authChecked,
    mounted,
    refresh,
    logout,
  };
}

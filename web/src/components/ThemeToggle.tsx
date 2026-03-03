'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'monstack-theme';

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem(STORAGE_KEY) as 'light' | 'dark' | null;
  if (stored) return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggle = useCallback(() => {

    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, [theme]);

  return (
    <Button variant="ghost" size="sm" onClick={toggle} aria-label={`Theme: ${theme}. Switch to ${theme === 'dark' ? 'light' : 'dark'}.`}>
      {theme === 'dark' ? '☀️' : '🌙'}
    </Button>
  );
}

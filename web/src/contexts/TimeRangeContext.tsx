'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export interface TimeRangeState {
  from: Date;
  to: Date;
  refreshIntervalMs: number;
}

const defaultRange = () => {
  const to = new Date();
  const from = new Date(to.getTime() - 3600000);
  return { from, to, refreshIntervalMs: 5000 };
};

type TimeRangeContextValue = TimeRangeState & {
  setRange: (from: Date, to: Date) => void;
  setRefreshInterval: (ms: number) => void;
  preset: (preset: '5m' | '15m' | '1h' | '6h' | '24h' | '7d') => void;
};

const TimeRangeContext = createContext<TimeRangeContextValue | null>(null);

export function TimeRangeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TimeRangeState>(() => {
    if (typeof window === 'undefined') return defaultRange();
    const stored = localStorage.getItem('monstack-time-range');
    if (stored) {
      try {
        const { from, to, refreshIntervalMs } = JSON.parse(stored);
        return {
          from: new Date(from),
          to: new Date(to),
          refreshIntervalMs: Number(refreshIntervalMs) || 5000,
        };
      } catch {
        return defaultRange();
      }
    }
    return defaultRange();
  });

  const setRange = useCallback((from: Date, to: Date) => {
    setState((s) => {
      const next = { ...s, from, to };
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'monstack-time-range',
          JSON.stringify({
            from: next.from.toISOString(),
            to: next.to.toISOString(),
            refreshIntervalMs: next.refreshIntervalMs,
          }),
        );
      }
      return next;
    });
  }, []);

  const setRefreshInterval = useCallback((refreshIntervalMs: number) => {
    setState((s) => {
      const next = { ...s, refreshIntervalMs };
      if (typeof window !== 'undefined') {
        localStorage.setItem('monstack-refresh-ms', String(refreshIntervalMs));
        localStorage.setItem(
          'monstack-time-range',
          JSON.stringify({
            from: s.from.toISOString(),
            to: s.to.toISOString(),
            refreshIntervalMs,
          }),
        );
      }
      return next;
    });
  }, []);

  const preset = useCallback(
    (p: '5m' | '15m' | '1h' | '6h' | '24h' | '7d') => {
      const to = new Date();
      const ms =
        p === '5m'
          ? 5 * 60 * 1000
          : p === '15m'
            ? 15 * 60 * 1000
            : p === '1h'
              ? 3600000
              : p === '6h'
                ? 6 * 3600000
                : p === '24h'
                  ? 24 * 3600000
                  : 7 * 24 * 3600000;
      const from = new Date(to.getTime() - ms);
      setRange(from, to);
    },
    [setRange],
  );

  const value = useMemo(
    () => ({ ...state, setRange, setRefreshInterval, preset }),
    [state, setRange, setRefreshInterval, preset],
  );

  return <TimeRangeContext.Provider value={value}>{children}</TimeRangeContext.Provider>;
}

export function useTimeRange() {
  const ctx = useContext(TimeRangeContext);
  if (!ctx) return null;
  return ctx;
}

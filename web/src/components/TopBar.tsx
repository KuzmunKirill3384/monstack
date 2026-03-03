'use client';

import { useTimeRange } from '@/contexts/TimeRangeContext';
import { Button } from '@/components/ui/button';

const PRESETS = [
  { label: 'Last 5m', value: '5m' as const },
  { label: 'Last 15m', value: '15m' as const },
  { label: 'Last 1h', value: '1h' as const },
  { label: 'Last 6h', value: '6h' as const },
  { label: 'Last 24h', value: '24h' as const },
  { label: 'Last 7d', value: '7d' as const },
  { label: 'Custom', value: 'custom' as const },
];

const REFRESH_OPTS = [
  { label: 'Off', ms: 0 },
  { label: '5s', ms: 5000 },
  { label: '10s', ms: 10000 },
  { label: '30s', ms: 30000 },
];

export function TopBar({
  onRefresh,
  isRefreshing,
}: {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  const ctx = useTimeRange();
  if (!ctx) return null;

  const rangeLabel =
    PRESETS.find((p) => {
      if (p.value === 'custom') return false;
      const to = ctx.to.getTime();
      const from = ctx.from.getTime();
      const diff = to - from;
      return (
        (p.value === '5m' && diff <= 5 * 60 * 1000 + 60000) ||
        (p.value === '15m' && diff <= 20 * 60 * 1000) ||
        (p.value === '1h' && diff <= 3700000) ||
        (p.value === '6h' && diff <= 6.5 * 3600000) ||
        (p.value === '24h' && diff <= 25 * 3600000) ||
        (p.value === '7d' && diff <= 8 * 24 * 3600000)
      );
    })?.label ?? 'Custom';

  return (
    <div className="border-b bg-muted/20 px-4 py-2 flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground text-sm">Time:</span>
        <select
          className="border-input rounded border bg-transparent px-2 py-1 text-sm"
          value={rangeLabel}
          onChange={(e) => {
            const p = PRESETS.find((x) => x.label === e.target.value);
            if (p && p.value !== 'custom') ctx.preset(p.value);
          }}
        >
          {PRESETS.map((p) => (
            <option key={p.value} value={p.label}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground text-sm">Refresh:</span>
        <select
          className="border-input rounded border bg-transparent px-2 py-1 text-sm"
          value={ctx.refreshIntervalMs}
          onChange={(e) => ctx.setRefreshInterval(Number(e.target.value))}
        >
          {REFRESH_OPTS.map((o) => (
            <option key={o.ms} value={o.ms}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {onRefresh && (
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>
          {isRefreshing ? '…' : 'Refresh'}
        </Button>
      )}
    </div>
  );
}

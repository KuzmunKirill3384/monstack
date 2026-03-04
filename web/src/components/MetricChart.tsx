'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { MetricPoint } from '@/lib/api';

interface MetricChartProps {
  data: MetricPoint[];
  dataKey: keyof MetricPoint;
  title: string;
  unit?: string;
}

export function MetricChart({ data, dataKey, title, unit = '' }: MetricChartProps) {
  const points = data.map((d) => ({
    ...d,
    time: new Date(d.ts).toLocaleTimeString(),
    value: typeof d[dataKey] === 'number' ? (d[dataKey] as number) : 0,
  }));

  return (
    <div className="h-64 min-h-[200px] w-full" role="img" aria-label={`Chart: ${title}`}>
      <h3 className="mb-2 text-sm font-medium" id={`chart-${dataKey}`}>{title}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload;
              const ts = p.ts ? new Date(p.ts).toLocaleString() : label;
              const val = typeof p.value === 'number' ? p.value + unit : '';
              return (
                <div className="rounded border bg-background px-3 py-2 text-sm shadow-md">
                  <div className="text-muted-foreground font-medium">{title}</div>
                  <div>{val}</div>
                  <div className="text-muted-foreground text-xs">{ts}</div>
                </div>
              );
            }}
          />
          <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api, type Host, type MetricPoint } from '@/lib/api';
import { useTimeRange } from '@/contexts/TimeRangeContext';
import { MetricChart } from '@/components/MetricChart';
import { StatPanel } from '@/components/StatPanel';
import { Button } from '@/components/ui/button';

export default function DashboardViewPage() {
  const params = useParams();
  const id = params.id as string;
  const timeRange = useTimeRange();
  const from = timeRange?.from;
  const to = timeRange?.to;
  const fromStr = from?.toISOString() ?? '';
  const toStr = to?.toISOString() ?? '';
  const hasRange = !!from && !!to;

  const { data: hosts = [] } = useQuery<Host[]>({
    queryKey: ['hosts'],
    queryFn: () => api<Host[]>('/hosts'),
  });

  const firstHostId = hosts[0]?.id;
  const { data: metrics } = useQuery<MetricPoint[]>({
    queryKey: ['metrics', firstHostId, fromStr, toStr],
    queryFn: () =>
      api<MetricPoint[]>(
        `/metrics?host=${firstHostId}&from=${encodeURIComponent(fromStr)}&to=${encodeURIComponent(toStr)}&resolution=raw`,
      ),
    enabled: !!firstHostId && hasRange,
    refetchInterval: (timeRange?.refreshIntervalMs ?? 0) > 0 ? (timeRange?.refreshIntervalMs ?? 5000) : false,
  });

  if (id === 'overview') {
    const cpuValues = metrics?.map((p) => p.cpu_total_pct) ?? [];
    const loadValues = metrics?.map((p) => p.load1) ?? [];
    const lastCpu = cpuValues.length ? cpuValues[cpuValues.length - 1]! : 0;
    const lastLoad = loadValues.length ? loadValues[loadValues.length - 1]! : 0;

    return (
      <div>
        <div className="mb-4 flex items-center gap-4">
          <Link href="/dashboards">
            <Button variant="ghost" size="sm">
              ← Dashboards
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold">Overview</h1>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatPanel
            title="Hosts"
            value={hosts.length}
            unit=""
            thresholdWarning={5}
            thresholdCritical={20}
          />
          {firstHostId && (
            <>
              <StatPanel
                title="CPU (first host)"
                value={lastCpu}
                unit="%"
                values={cpuValues}
                thresholdWarning={70}
                thresholdCritical={90}
              />
              <StatPanel
                title="Load 1m (first host)"
                value={lastLoad}
                unit=""
                values={loadValues}
              />
            </>
          )}
        </div>
        {firstHostId && metrics && metrics.length > 0 && (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border bg-card p-4">
              <MetricChart
                data={metrics}
                dataKey="cpu_total_pct"
                title="CPU %"
                unit="%"
              />
            </div>
            <div className="rounded-lg border bg-card p-4">
              <MetricChart
                data={metrics}
                dataKey="load1"
                title="Load 1m"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <Link href="/dashboards">
          <Button variant="ghost" size="sm">
            ← Dashboards
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold">{id}</h1>
      </div>
      <p className="text-muted-foreground">Dashboard not found.</p>
    </div>
  );
}

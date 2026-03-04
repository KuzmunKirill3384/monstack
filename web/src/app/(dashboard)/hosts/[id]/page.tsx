'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { api, type Host, type MetricPoint } from '@/lib/api';
import { MetricChart } from '@/components/MetricChart';
import { ProcessTable } from '@/components/ProcessTable';
import { DateRangePicker, rangeToDates, type RangePreset } from '@/components/DateRangePicker';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Breadcrumbs } from '@/components/Breadcrumbs';

function HostDetailPageSkeleton() {
  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-2 w-2 rounded-full" />
      </div>
      <div className="mb-4 flex gap-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="mb-4">
        <Skeleton className="h-9 w-64" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-[200px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function HostDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [range, setRange] = useState<RangePreset>('1h');
  const [activeTab, setActiveTab] = useState<'metrics' | 'processes'>('metrics');

  const { from, to } = rangeToDates(range);
  const fromStr = from.toISOString();
  const toStr = to.toISOString();

  const { data: host } = useQuery<Host>({
    queryKey: ['host', id],
    queryFn: () => api<Host>(`/hosts/${id}`),
  });

  const { data: metrics } = useQuery<MetricPoint[]>({
    queryKey: ['metrics', id, fromStr, toStr],
    queryFn: () =>
      api<MetricPoint[]>(
        `/metrics?host=${id}&from=${encodeURIComponent(fromStr)}&to=${encodeURIComponent(toStr)}&resolution=1m`
      ),
    enabled: !!id && activeTab === 'metrics',
    refetchInterval: activeTab === 'metrics' ? 15_000 : false,
  });

  if (!host) return <HostDetailPageSkeleton />;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <Breadcrumbs items={[{ label: 'Hosts', href: '/hosts' }, { label: host.name }]} />
        <span
          className={`h-2 w-2 rounded-full ${host.online ? 'bg-green-500' : 'bg-muted-foreground/50'}`}
          title={host.online ? 'Online' : 'Offline'}
        />
      </div>
      <h1 className="mb-4 text-2xl font-semibold">{host.name}</h1>

      <div className="mb-4 flex gap-2">
        <Button
          variant={activeTab === 'metrics' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('metrics')}
        >
          Metrics
        </Button>
        <Button
          variant={activeTab === 'processes' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('processes')}
        >
          Processes
        </Button>
      </div>

      {activeTab === 'metrics' && (
        <>
          <div className="mb-4">
            <DateRangePicker value={range} onChange={setRange} />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardContent className="pt-4">
                <MetricChart
                  data={metrics ?? []}
                  dataKey="cpu_total_pct"
                  title="CPU %"
                  unit="%"
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <MetricChart
                  data={metrics ?? []}
                  dataKey="mem_used_mb"
                  title="Memory used (MB)"
                  unit=" MB"
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <MetricChart
                  data={metrics ?? []}
                  dataKey="net_rx_bps"
                  title="Network RX (bps)"
                  unit=" bps"
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <MetricChart
                  data={metrics ?? []}
                  dataKey="net_tx_bps"
                  title="Network TX (bps)"
                  unit=" bps"
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <MetricChart
                  data={metrics ?? []}
                  dataKey="disk_used_pct"
                  title="Disk used %"
                  unit="%"
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {activeTab === 'processes' && (
        <Card>
          <CardContent className="pt-4">
            <ProcessTable hostId={id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

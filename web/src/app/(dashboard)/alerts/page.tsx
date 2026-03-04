'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAlertsStream } from '@/hooks/useAlertsStream';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import type { Host } from '@/lib/api';

function AlertsPageSkeleton() {
  return (
    <div>
      <Skeleton className="mb-6 h-8 w-48" />
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-md border bg-muted/20 p-3">
        <div className="space-y-1">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-9 w-48" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-6" />
          <Skeleton className="h-9 w-48" />
        </div>
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-14 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

interface AlertEvent {
  id: string;
  hostId: string;
  ruleId: string;
  ts: string;
  status: string;
  message: string | null;
  rule: { metric: string; threshold: number | null; op: string };
}

function buildAlertsParams(f: { host?: string; status?: string; from?: string; to?: string }) {
  const params = new URLSearchParams();
  if (f.host) params.set('host', f.host);
  if (f.status) params.set('status', f.status);
  if (f.from) params.set('from', f.from);
  if (f.to) params.set('to', f.to);
  const q = params.toString();
  return q ? `/alerts?${q}` : '/alerts';
}

export default function AlertsPage() {
  const [hostFilter, setHostFilter] = React.useState<string>('');
  const [statusFilter, setStatusFilter] = React.useState<string>('');
  const [fromFilter, setFromFilter] = React.useState<string>('');
  const [toFilter, setToFilter] = React.useState<string>('');

  const { data: hosts = [] } = useQuery<Host[]>({
    queryKey: ['hosts'],
    queryFn: () => api<Host[]>('/hosts'),
  });

  const params = React.useMemo(() => {
    const from = fromFilter ? new Date(fromFilter).toISOString() : undefined;
    const to = toFilter ? new Date(toFilter).toISOString() : undefined;
    return buildAlertsParams({
      host: hostFilter || undefined,
      status: statusFilter || undefined,
      from,
      to,
    });
  }, [hostFilter, statusFilter, fromFilter, toFilter]);

  const refreshMs = typeof window !== 'undefined' ? Number(localStorage.getItem('monstack-refresh-ms')) || 5000 : 5000;
  useAlertsStream(true);
  const { data: events, isLoading } = useQuery<AlertEvent[]>({
    queryKey: ['alerts', params],
    queryFn: () => api<AlertEvent[]>(params),
    refetchInterval: refreshMs,
  });

  if (isLoading) return <AlertsPageSkeleton />;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Alert events</h1>
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-md border bg-muted/20 p-3">
        <div>
          <label className="text-muted-foreground mb-1 block text-xs">Host</label>
          <select
            className="border-input rounded-md border bg-transparent px-3 py-1.5 text-sm"
            value={hostFilter}
            onChange={(e) => setHostFilter(e.target.value)}
          >
            <option value="">All</option>
            {hosts.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-muted-foreground mb-1 block text-xs">Status</label>
          <select
            className="border-input rounded-md border bg-transparent px-3 py-1.5 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="firing">firing</option>
            <option value="ok">ok</option>
          </select>
        </div>
        <div>
          <label className="text-muted-foreground mb-1 block text-xs">From</label>
          <Input
            type="datetime-local"
            value={fromFilter}
            onChange={(e) => setFromFilter(e.target.value)}
            className="w-48"
          />
        </div>
        <div>
          <label className="text-muted-foreground mb-1 block text-xs">To</label>
          <Input
            type="datetime-local"
            value={toFilter}
            onChange={(e) => setToFilter(e.target.value)}
            className="w-48"
          />
        </div>
      </div>
      <div className="space-y-4">
        {events?.map((e) => (
          <Card key={e.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {e.rule.metric} {e.rule.op} {e.rule.threshold ?? 'N/A'}
              </CardTitle>
              <span
                className={`rounded px-2 py-0.5 text-xs ${
                  e.status === 'firing' ? 'bg-destructive/20 text-destructive' : 'bg-muted'
                }`}
              >
                {e.status}
              </span>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                {new Date(e.ts).toLocaleString()} — {e.message ?? e.status}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      {(!events || events.length === 0) && (
        <EmptyState
          title="No alert events"
          description="Events appear when alert rules fire. Create rules in Alert rules and wait for thresholds to be crossed."
          action={{ label: 'Alert rules', href: '/alerts/rules' }}
        />
      )}
    </div>
  );
}

'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api, type Host } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { HostSparkline } from '@/components/HostSparkline';

function HostsPageSkeleton() {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-9 w-full max-w-xs" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-2 w-2 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="mb-1 h-3 w-32" />
              <Skeleton className="mb-1 h-3 w-full" />
              <Skeleton className="mb-2 h-4 w-3/4" />
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function HostsPage() {
  const [search, setSearch] = React.useState('');
  const { data: hosts = [], isLoading } = useQuery<Host[]>({
    queryKey: ['hosts'],
    queryFn: () => api<Host[]>('/hosts'),
  });

  const filtered = React.useMemo(() => {
    if (!search.trim()) return hosts;
    const q = search.trim().toLowerCase();
    return hosts.filter((h) => (h.name || '').toLowerCase().includes(q) || (h.id || '').toLowerCase().includes(q));
  }, [hosts, search]);

  if (isLoading) return <HostsPageSkeleton />;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Hosts</h1>
        <Input
          placeholder="Search by name or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
          aria-label="Search hosts"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((host) => {
          const m = host.lastMetric;
          const memPct = m && m.mem_total_mb > 0 ? ((m.mem_used_mb / m.mem_total_mb) * 100).toFixed(1) : null;
          return (
            <Card key={host.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <span className="font-medium">{host.name}</span>
                <span
                  className={`h-2 w-2 rounded-full ${
                    host.online ? 'bg-green-500' : 'bg-muted-foreground/50'
                  }`}
                  title={host.online ? 'Online' : 'Offline'}
                  aria-hidden
                />
              </CardHeader>
              <CardContent>
                {m && (
                  <p className="text-muted-foreground mb-1 text-xs">
                    CPU {m.cpu_total_pct.toFixed(1)}% · Mem {memPct}% · Load {m.load1.toFixed(2)}
                  </p>
                )}
                <p className="text-muted-foreground flex items-center gap-1 text-xs">
                  CPU <HostSparkline hostId={host.id} />
                </p>
                <p className="text-muted-foreground text-sm">
                  Last seen: {host.lastSeenAt ? new Date(host.lastSeenAt).toLocaleString() : 'Never'}
                </p>
                <Link href={`/hosts/${host.id}`}>
                  <Button variant="outline" size="sm" className="mt-2">
                    View metrics
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <EmptyState
          title={hosts.length === 0 ? 'No hosts registered yet' : 'No hosts match the search'}
          description={
            hosts.length === 0
              ? 'Hosts appear when an agent sends metrics. Deploy the agent on your servers and configure it to point to this backend.'
              : undefined
          }
          action={hosts.length === 0 ? { label: 'View documentation' } : undefined}
        />
      )}
    </div>
  );
}

'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api, type Host } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

  if (isLoading) return <p>Loading hosts...</p>;

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
        <p className="text-muted-foreground">
          {hosts.length === 0 ? 'No hosts registered yet.' : 'No hosts match the search.'}
        </p>
      )}
    </div>
  );
}

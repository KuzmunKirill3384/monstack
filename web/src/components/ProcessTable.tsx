'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type ProcSnapshot } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const REFRESH_MS = 2000;
const PROCESS_LIMIT = 300;
const SIGNALS = ['SIGTERM', 'SIGKILL'] as const;

type SortKey = 'pid' | 'name' | 'cpu_pct' | 'rss_mb' | 'state';

export function ProcessTable({ hostId }: { hostId: string }) {
  const queryClient = useQueryClient();
  const [sortBy, setSortBy] = useState<SortKey>('cpu_pct');
  const [sortDesc, setSortDesc] = useState(true);
  const [filter, setFilter] = useState('');
  const [confirmKill, setConfirmKill] = useState<{ pid: number; signal: string } | null>(null);
  const [sending, setSending] = useState(false);

  const to = new Date();
  const from = new Date(to.getTime() - 120000);

  const { data: processes = [], isLoading } = useQuery<ProcSnapshot[]>({
    queryKey: ['processes-live', hostId],
    queryFn: () =>
      api<ProcSnapshot[]>(
        `/processes?host=${hostId}&from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}&limit=${PROCESS_LIMIT}`
      ),
    refetchInterval: REFRESH_MS,
  });

  const filtered = useMemo(() => {
    if (!filter.trim()) return processes;
    const f = filter.trim().toLowerCase();
    return processes.filter(
      (p) =>
        String(p.pid).includes(f) ||
        (p.name || '').toLowerCase().includes(f) ||
        (p.state || '').toLowerCase().includes(f)
    );
  }, [processes, filter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va: string | number = a[sortBy] ?? '';
      let vb: string | number = b[sortBy] ?? '';
      if (sortBy === 'name' || sortBy === 'state') {
        va = String(va).toLowerCase();
        vb = String(vb).toLowerCase();
        const c = va < vb ? -1 : va > vb ? 1 : 0;
        return sortDesc ? -c : c;
      }
      const c = (va as number) - (vb as number);
      return sortDesc ? -c : c;
    });
  }, [filtered, sortBy, sortDesc]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortDesc((d) => !d);
    else {
      setSortBy(key);
      setSortDesc(key === 'name' || key === 'state' ? false : true);
    }
  };

  const sendSignal = async (pid: number, signal: string) => {
    setSending(true);
    try {
      await api(`/hosts/${hostId}/processes/${pid}/signal`, {
        method: 'POST',
        body: JSON.stringify({ signal }),
      });
      setConfirmKill(null);
      queryClient.invalidateQueries({ queryKey: ['processes-live', hostId] });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to send signal');
    } finally {
      setSending(false);
    }
  };

  const th = (key: SortKey, label: string, align: 'left' | 'right' = 'left') => (
    <th
      className={`cursor-pointer select-none border-b bg-muted/50 px-2 py-1.5 text-xs font-medium hover:bg-muted ${align === 'right' ? 'text-right' : 'text-left'}`}
      onClick={() => handleSort(key)}
    >
      {label}
      {sortBy === key && (sortDesc ? ' ↓' : ' ↑')}
    </th>
  );

  return (
    <div className="space-y-2" role="region" aria-label="Process list">
      <div className="flex flex-wrap items-center gap-4">
        <Input
          placeholder="Filter by PID or name..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-xs font-mono text-sm"
        />
        <span className="text-muted-foreground text-sm">
          {sorted.length} process{sorted.length !== 1 ? 'es' : ''}
          {filter && ` (filtered)`} · auto-refresh {REFRESH_MS / 1000}s
        </span>
      </div>
      <div className="overflow-auto rounded-md border bg-background font-mono text-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {th('pid', 'PID', 'right')}
              {th('name', 'NAME', 'left')}
              {th('cpu_pct', 'CPU%', 'right')}
              {th('rss_mb', 'RSS (MB)', 'right')}
              {th('state', 'STATE', 'left')}
              <th className="border-b bg-muted/50 px-2 py-1.5 text-right text-xs font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-muted-foreground">
                  No process data. Agent sends processes every ~30s.
                </td>
              </tr>
            )}
            {!isLoading &&
              sorted.map((p, i) => (
                <tr
                  key={`${p.pid}-${p.ts}-${i}`}
                  className={`border-b border-border/50 ${i % 2 ? 'bg-muted/20' : ''} hover:bg-muted/40`}
                >
                  <td className="w-16 px-2 py-1 text-right tabular-nums">{p.pid}</td>
                  <td className="max-w-[280px] truncate px-2 py-1" title={p.name || ''}>
                    {p.name || '-'}
                  </td>
                  <td className="w-16 px-2 py-1 text-right tabular-nums">{p.cpu_pct.toFixed(1)}</td>
                  <td className="w-20 px-2 py-1 text-right tabular-nums">{p.rss_mb.toFixed(1)}</td>
                  <td className="w-16 px-2 py-1">{p.state ?? '-'}</td>
                  <td className="w-28 px-2 py-1 text-right">
                    {confirmKill?.pid === p.pid ? (
                      <span className="flex items-center justify-end gap-1">
                        {SIGNALS.map((sig) => (
                          <Button
                            key={sig}
                            variant="destructive"
                            size="sm"
                            disabled={sending}
                            onClick={() => sendSignal(p.pid, sig)}
                          >
                            {sig.replace('SIG', '')}
                          </Button>
                        ))}
                        <Button variant="ghost" size="sm" onClick={() => setConfirmKill(null)}>
                          Cancel
                        </Button>
                      </span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmKill({ pid: p.pid, signal: 'SIGTERM' })}
                        aria-label={`Send signal to PID ${p.pid}`}
                      >
                        Kill
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

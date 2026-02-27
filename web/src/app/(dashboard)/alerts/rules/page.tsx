'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Host } from '@/lib/api';

interface AlertRule {
  id: string;
  hostId: string | null;
  metric: string;
  op: string;
  threshold: number | null;
  window: string;
  severity: string;
  enabled: boolean;
  createdAt: string;
}

export default function AlertRulesPage() {
  const queryClient = useQueryClient();
  const [hostFilter, setHostFilter] = React.useState<string>('');
  const [showAdd, setShowAdd] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const { data: hosts = [] } = useQuery<Host[]>({
    queryKey: ['hosts'],
    queryFn: () => api<Host[]>('/hosts'),
  });

  const { data: rules = [], isLoading } = useQuery<AlertRule[]>({
    queryKey: ['alert-rules', hostFilter || null],
    queryFn: () =>
      api<AlertRule[]>(
        hostFilter ? `/alert-rules?host=${encodeURIComponent(hostFilter)}` : '/alert-rules'
      ),
  });

  const createMutation = useMutation({
    mutationFn: (body: Partial<AlertRule>) => api<AlertRule>('/alert-rules', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      setShowAdd(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: string; enabled?: boolean; threshold?: number }) =>
      api(`/alert-rules/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/alert-rules/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alert-rules'] }),
  });

  if (isLoading) return <p>Loading rules...</p>;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Alert rules</h1>
        <div className="flex items-center gap-2">
          <label className="text-muted-foreground text-sm">Host:</label>
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
          <Button onClick={() => setShowAdd(true)}>Add rule</Button>
        </div>
      </div>

      {showAdd && (
        <AddRuleForm
          hosts={hosts}
          onSave={(body) => createMutation.mutate(body)}
          onCancel={() => setShowAdd(false)}
          isPending={createMutation.isPending}
        />
      )}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="border-b px-4 py-2 text-left font-medium">Host</th>
              <th className="border-b px-4 py-2 text-left font-medium">Metric</th>
              <th className="border-b px-4 py-2 text-left font-medium">Op</th>
              <th className="border-b px-4 py-2 text-left font-medium">Threshold</th>
              <th className="border-b px-4 py-2 text-left font-medium">Enabled</th>
              <th className="border-b px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-4 py-2">
                  {r.hostId ? hosts.find((h) => h.id === r.hostId)?.name ?? r.hostId.slice(0, 8) : '—'}
                </td>
                <td className="px-4 py-2">{r.metric}</td>
                <td className="px-4 py-2">{r.op}</td>
                <td className="px-4 py-2">{r.threshold ?? '—'}</td>
                <td className="px-4 py-2">
                  {editingId === r.id ? (
                    <button
                      className="text-primary underline"
                      onClick={() => {
                        updateMutation.mutate({ id: r.id, enabled: !r.enabled });
                      }}
                    >
                      {r.enabled ? 'Disable' : 'Enable'}
                    </button>
                  ) : (
                    <span>{r.enabled ? 'Yes' : 'No'}</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  {editingId === r.id ? (
                    <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                      Done
                    </Button>
                  ) : (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(r.id)}>
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="ml-1"
                        onClick={() => deleteMutation.mutate(r.id)}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rules.length === 0 && (
        <p className="text-muted-foreground mt-4">No alert rules. Add one to get started.</p>
      )}
    </div>
  );
}

function AddRuleForm({
  hosts,
  onSave,
  onCancel,
  isPending,
}: {
  hosts: Host[];
  onSave: (body: Partial<AlertRule>) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [hostId, setHostId] = React.useState<string>('');
  const [metric, setMetric] = React.useState('cpu_total_pct');
  const [op, setOp] = React.useState('gt');
  const [threshold, setThreshold] = React.useState('');
  const [window, setWindow] = React.useState('5m');
  const [severity, setSeverity] = React.useState('warning');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      hostId: hostId || null,
      metric,
      op,
      threshold: threshold === '' ? null : Number(threshold),
      window,
      severity,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-md border bg-muted/20 p-4">
      <h2 className="mb-3 text-lg font-medium">New rule</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="text-muted-foreground mb-1 block text-xs">Host (optional)</label>
          <select
            className="border-input w-full rounded-md border bg-transparent px-3 py-1.5 text-sm"
            value={hostId}
            onChange={(e) => setHostId(e.target.value)}
          >
            <option value="">All hosts</option>
            {hosts.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-muted-foreground mb-1 block text-xs">Metric</label>
          <Input
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            placeholder="cpu_total_pct"
          />
        </div>
        <div>
          <label className="text-muted-foreground mb-1 block text-xs">Op</label>
          <select
            className="border-input w-full rounded-md border bg-transparent px-3 py-1.5 text-sm"
            value={op}
            onChange={(e) => setOp(e.target.value)}
          >
            <option value="gt">&gt;</option>
            <option value="lt">&lt;</option>
            <option value="gte">&gt;=</option>
            <option value="lte">&lt;=</option>
            <option value="eq">=</option>
          </select>
        </div>
        <div>
          <label className="text-muted-foreground mb-1 block text-xs">Threshold</label>
          <Input
            type="number"
            step="any"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder="80"
          />
        </div>
        <div>
          <label className="text-muted-foreground mb-1 block text-xs">Window</label>
          <Input value={window} onChange={(e) => setWindow(e.target.value)} placeholder="5m" />
        </div>
        <div>
          <label className="text-muted-foreground mb-1 block text-xs">Severity</label>
          <Input value={severity} onChange={(e) => setSeverity(e.target.value)} placeholder="warning" />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button type="submit" disabled={isPending}>
          Create
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import type { Host } from '@/lib/api';

function AlertRulesHint() {
  return (
    <details className="text-muted-foreground mb-4 rounded-md border bg-muted/20 text-sm">
      <summary className="cursor-pointer list-none px-4 py-2 font-medium [&::-webkit-details-marker]:hidden">
        How to create a rule
      </summary>
      <div className="border-t px-4 py-3">
        <p className="mb-2">
          Choose a <strong>metric</strong> (e.g. <code className="rounded bg-muted px-1">cpu_total_pct</code>), an
          <strong> operator</strong> (e.g. &gt;), and a <strong>threshold</strong> (e.g. 90). When the metric crosses
          the threshold for the given <strong>window</strong>, an alert event is created. Optionally scope the rule to a
          specific host.
        </p>
      </div>
    </details>
  );
}

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

  if (isLoading) {
    return (
      <div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Skeleton className="h-8 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <Skeleton className="h-64 w-full rounded-md" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Breadcrumbs items={[{ label: 'Alerts', href: '/alerts' }, { label: 'Alert rules' }]} />
      </div>
      <AlertRulesHint />
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
        <EmptyState
          title="No alert rules"
          description="Create a rule to get notified when a metric crosses a threshold (e.g. CPU &gt; 90%)."
          action={{ label: 'Add rule', onClick: () => setShowAdd(true) }}
        />
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
  const [errors, setErrors] = React.useState<{ metric?: string; threshold?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: { metric?: string; threshold?: string } = {};
    if (!metric.trim()) nextErrors.metric = 'Metric is required';
    const thresholdNum = threshold.trim() === '' ? null : Number(threshold);
    if (threshold.trim() !== '' && (Number.isNaN(thresholdNum) || thresholdNum == null)) {
      nextErrors.threshold = 'Enter a valid number';
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    onSave({
      hostId: hostId || null,
      metric: metric.trim(),
      op,
      threshold: thresholdNum,
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
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            value={hostId}
            onChange={(e) => setHostId(e.target.value)}
            aria-label="Host"
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
            onChange={(e) => {
              setMetric(e.target.value);
              if (errors.metric) setErrors((prev) => ({ ...prev, metric: undefined }));
            }}
            placeholder="cpu_total_pct"
            aria-invalid={!!errors.metric}
            aria-describedby={errors.metric ? 'metric-error' : undefined}
          />
          {errors.metric && (
            <p id="metric-error" className="text-destructive mt-1 text-xs" role="alert">
              {errors.metric}
            </p>
          )}
        </div>
        <div>
          <label className="text-muted-foreground mb-1 block text-xs">Op</label>
          <select
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            value={op}
            onChange={(e) => setOp(e.target.value)}
            aria-label="Operator"
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
            onChange={(e) => {
              setThreshold(e.target.value);
              if (errors.threshold) setErrors((prev) => ({ ...prev, threshold: undefined }));
            }}
            placeholder="80"
            aria-invalid={!!errors.threshold}
            aria-describedby={errors.threshold ? 'threshold-error' : undefined}
          />
          {errors.threshold && (
            <p id="threshold-error" className="text-destructive mt-1 text-xs" role="alert">
              {errors.threshold}
            </p>
          )}
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

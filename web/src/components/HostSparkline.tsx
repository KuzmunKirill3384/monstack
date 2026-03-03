'use client';

import { useQuery } from '@tanstack/react-query';
import { api, type MetricPoint } from '@/lib/api';
import { Sparkline } from './Sparkline';

export function HostSparkline({ hostId }: { hostId: string }) {
  const { data } = useQuery<MetricPoint[]>({
    queryKey: ['metrics', hostId, 'sparkline'],
    queryFn: async () => {
      const to = new Date();
      const from = new Date(to.getTime() - 3600000);
      const params = new URLSearchParams({
        host: hostId,
        from: from.toISOString(),
        to: to.toISOString(),
        resolution: 'raw',
      });
      return api<MetricPoint[]>(`/metrics?${params}`);
    },
    staleTime: 60000,
  });
  const values = data?.map((p) => p.cpu_total_pct) ?? [];
  return <Sparkline values={values} width={20} className="text-muted-foreground" />;
}

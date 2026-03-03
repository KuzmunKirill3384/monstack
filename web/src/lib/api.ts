const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  if (res.status === 401) throw new Error('Unauthorized');
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface HostLastMetric {
  cpu_total_pct: number;
  mem_used_mb: number;
  mem_total_mb: number;
  load1: number;
  load5: number;
  load15: number;
}

export interface Host {
  id: string;
  name: string;
  os: string | null;
  arch: string | null;
  tags: unknown;
  createdAt: string;
  lastSeenAt: string | null;
  online: boolean;
  lastMetric?: HostLastMetric | null;
}

export interface MetricPoint {
  ts: string;
  cpu_total_pct: number;
  load1: number;
  load5: number;
  load15: number;
  mem_used_mb: number;
  mem_total_mb: number;
  disk_used_pct: number;
  net_rx_bps: number;
  net_tx_bps: number;
}

export interface ProcSnapshot {
  ts: string;
  pid: number;
  name: string;
  cpu_pct: number;
  rss_mb: number;
  io_read_bps: number | null;
  io_write_bps: number | null;
  state: string | null;
}

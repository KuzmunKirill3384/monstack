const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const DEFAULT_TIMEOUT_MS = 30_000;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T>(
  path: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...fetchOptions,
      headers,
      credentials: 'include',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.status === 401) throw new ApiError('Unauthorized', 401);
    if (!res.ok) {
      const body = await res.text();
      const message =
        res.status === 403
          ? 'Access denied'
          : res.status === 404
            ? 'Not found'
            : res.status >= 500
              ? 'Server error. Try again later.'
              : body || `Request failed (${res.status})`;
      throw new ApiError(message, res.status, body);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError('Request timed out', 408);
    }
    throw err;
  }
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
  cmd: string | null;
  cpu_pct: number;
  rss_mb: number;
  io_read_bps: number | null;
  io_write_bps: number | null;
  state: string | null;
}

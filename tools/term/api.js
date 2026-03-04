import { config } from './config.js';

async function fetchWithTimeout(url, opts = {}, timeoutMs = config.API_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...opts,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export async function apiGet(path, retries = config.API_RETRIES) {
  const url = new URL(path, config.API_URL);
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetchWithTimeout(url.toString());
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status} ${text}`);
      }
      return res.json();
    } catch (e) {
      lastErr = e;
      if (e.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      if (i < retries - 1) {
        const delay = 1000 * (i + 1);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

export async function apiPost(path, body, retries = 1) {
  const url = new URL(path, config.API_URL);
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetchWithTimeout(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text() || res.statusText);
      return res.json();
    } catch (e) {
      lastErr = e;
      if (i < retries - 1) await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw lastErr;
}

export async function apiPatch(path, body, retries = 1) {
  const url = new URL(path, config.API_URL);
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetchWithTimeout(url.toString(), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text() || res.statusText);
      return res.json();
    } catch (e) {
      lastErr = e;
      if (i < retries - 1) await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw lastErr;
}

export function getHosts() {
  return apiGet('/hosts');
}

export function getMetrics(hostId, from, to) {
  const params = new URLSearchParams({
    host: hostId,
    from: from.toISOString(),
    to: to.toISOString(),
    resolution: 'raw',
  });
  return apiGet(`/metrics?${params}`);
}

export function getProcesses(hostId, limit = config.PROCESS_LIMIT) {
  const to = new Date();
  const from = new Date(to.getTime() - 600000);
  const params = new URLSearchParams({
    host: hostId,
    from: from.toISOString(),
    to: to.toISOString(),
    limit: String(limit),
  });
  return apiGet(`/processes?${params}`);
}

export function getAlerts(opts = {}) {
  const params = new URLSearchParams();
  if (opts.host) params.set('host', opts.host);
  if (opts.from) params.set('from', opts.from.toISOString());
  if (opts.to) params.set('to', opts.to.toISOString());
  if (opts.status) params.set('status', opts.status);
  return apiGet(`/alerts?${params}`);
}

export function getAlertRules(hostId) {
  const path = hostId ? `/alert-rules?host=${hostId}` : '/alert-rules';
  return apiGet(path);
}

export async function checkBackend() {
  const url = new URL('/ready', config.API_URL);
  try {
    const res = await fetchWithTimeout(url.toString(), {}, 5000);
    return res.ok;
  } catch {
    return false;
  }
}

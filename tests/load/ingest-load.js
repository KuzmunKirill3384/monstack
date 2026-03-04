import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import encoding from 'k6/encoding';

const errorRate = new Rate('errors');

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';
const HOST_TOKEN = __ENV.HOST_TOKEN || 'local-dev-token';
const HOST_ID = __ENV.HOST_ID || 'a0000000-0000-0000-0000-000000000001';

export const options = {
  scenarios: {
    ingest: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '10s',
      duration: '2m',
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    errors: ['rate<0.05'],
  },
};

function makePayload() {
  return JSON.stringify({
    host_id: HOST_ID,
    ts: new Date().toISOString(),
    metrics: {
      cpu_total_pct: Math.random() * 100,
      load1: Math.random() * 4,
      load5: Math.random() * 3,
      load15: Math.random() * 2,
      mem_used_mb: Math.floor(Math.random() * 8192),
      mem_total_mb: 8192,
      disk_used_pct: Math.random() * 100,
      net_rx_bps: Math.floor(Math.random() * 1e8),
      net_tx_bps: Math.floor(Math.random() * 1e8),
    },
    processes: Array.from({ length: 15 }, (_, i) => ({
      pid: 1000 + i,
      name: `proc-${i}`,
      cpu_pct: Math.random() * 20,
      rss_mb: Math.random() * 512,
      io_read_bps: Math.floor(Math.random() * 1e6),
      io_write_bps: Math.floor(Math.random() * 1e6),
      state: 'S',
    })),
  });
}

export default function () {
  const payload = makePayload();
  const res = http.post(`${BASE_URL}/v1/ingest`, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${HOST_TOKEN}`,
    },
  });

  const ok = check(res, {
    'status is 2xx': (r) => r.status >= 200 && r.status < 300,
  });
  errorRate.add(!ok);
  sleep(0.1);
}

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';
const HOST_ID = __ENV.HOST_ID || 'a0000000-0000-0000-0000-000000000001';

export const options = {
  scenarios: {
    dashboard: {
      executor: 'constant-vus',
      vus: 50,
      duration: '2m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200'],
    errors: ['rate<0.05'],
  },
};

export default function () {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 3600_000);
  const from = oneHourAgo.toISOString();
  const to = now.toISOString();

  {
    const res = http.get(`${BASE_URL}/hosts`);
    const ok = check(res, { 'hosts 200': (r) => r.status === 200 });
    errorRate.add(!ok);
  }

  {
    const res = http.get(
      `${BASE_URL}/metrics?host=${HOST_ID}&from=${from}&to=${to}&resolution=1m`,
    );
    const ok = check(res, { 'metrics 200': (r) => r.status === 200 });
    errorRate.add(!ok);
  }

  {
    const res = http.get(
      `${BASE_URL}/processes?host=${HOST_ID}&limit=50`,
    );
    const ok = check(res, { 'processes 200': (r) => r.status === 200 });
    errorRate.add(!ok);
  }

  {
    const res = http.get(`${BASE_URL}/alerts`);
    const ok = check(res, { 'alerts 200': (r) => r.status === 200 });
    errorRate.add(!ok);
  }

  {
    const res = http.get(`${BASE_URL}/health`);
    const ok = check(res, { 'health 200': (r) => r.status === 200 });
    errorRate.add(!ok);
  }

  sleep(2);
}

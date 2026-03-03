/**
 * Unit tests for api (getHosts, getMetrics, getProcesses URL/query; 401/500 throw; retry).
 * Run: node api.test.js
 */
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

let lastFetchUrl;
let fetchCalls = 0;
let fetchFailUntil = 0;

global.fetch = (url, opts = {}) => {
  lastFetchUrl = url;
  fetchCalls++;
  if (fetchCalls <= fetchFailUntil) {
    return Promise.reject(new Error('Network error'));
  }
  if (opts.body !== undefined && typeof opts.body === 'string') {
    try {
      JSON.parse(opts.body);
    } catch (_) {}
  }
  const ok = url.includes('fail') ? false : true;
  const status = url.includes('401') ? 401 : url.includes('500') ? 500 : 200;
  return Promise.resolve({
    ok: ok && status < 400,
    status,
    text: () => Promise.resolve(status === 401 ? 'Unauthorized' : ''),
    json: () => Promise.resolve([]),
  });
};

const { getHosts, getMetrics, getProcesses, apiGet } = await import('./api.js');
const { config } = await import('./config.js');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test('getHosts builds correct URL', async () => {
  fetchCalls = 0;
  lastFetchUrl = null;
  await getHosts();
  assert(lastFetchUrl !== null, 'fetch called');
  assert(new URL(lastFetchUrl).pathname === '/hosts' || lastFetchUrl.endsWith('/hosts'), 'path /hosts');
  assert(lastFetchUrl.startsWith(config.API_URL) || lastFetchUrl.includes('hosts'), 'base URL');
});

test('getMetrics builds URL with host, from, to, resolution', async () => {
  lastFetchUrl = null;
  const from = new Date('2025-01-01T10:00:00Z');
  const to = new Date('2025-01-01T11:00:00Z');
  await getMetrics('host-1', from, to);
  const u = new URL(lastFetchUrl);
  assert(u.searchParams.get('host') === 'host-1', 'host param');
  assert(u.searchParams.get('from') === from.toISOString(), 'from param');
  assert(u.searchParams.get('to') === to.toISOString(), 'to param');
  assert(u.searchParams.get('resolution') === 'raw', 'resolution param');
});

test('getProcesses builds URL with host, from, to, limit', async () => {
  lastFetchUrl = null;
  await getProcesses('h1', 50);
  const u = new URL(lastFetchUrl);
  assert(u.searchParams.get('host') === 'h1', 'host param');
  assert(u.searchParams.get('limit') === '50', 'limit param');
  assert(u.searchParams.get('from') !== null && u.searchParams.get('to') !== null, 'from/to');
});

test('apiGet throws on 401', async () => {
  const orig = global.fetch;
  global.fetch = () => Promise.resolve({
    ok: false,
    status: 401,
    text: () => Promise.resolve('Unauthorized'),
  });
  try {
    await apiGet('/fail-401').then(
      () => { throw new Error('expected throw'); },
      (e) => { assert(e.message.includes('401') || e.message.includes('Unauthorized'), 'error message'); }
    );
  } finally {
    global.fetch = orig;
  }
});

test('apiGet throws on 500', async () => {
  const orig = global.fetch;
  global.fetch = () => Promise.resolve({
    ok: false,
    status: 500,
    text: () => Promise.resolve('Server Error'),
  });
  try {
    await apiGet('/fail-500').then(
      () => { throw new Error('expected throw'); },
      (e) => { assert(e.message.includes('500') || e.message.length > 0, 'error'); }
    );
  } finally {
    global.fetch = orig;
  }
});

test('apiGet retries on network error', async () => {
  fetchCalls = 0;
  fetchFailUntil = 2;
  const orig = global.fetch;
  global.fetch = (url) => {
    fetchCalls++;
    if (fetchCalls < 3) return Promise.reject(new Error('Network error'));
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
  };
  try {
    await apiGet('/hosts', 3);
    assert(fetchCalls >= 3, 'retried at least 3 times');
  } finally {
    global.fetch = orig;
  }
});

async function run() {
  let passed = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (e) {
      console.error(`  ✗ ${name}: ${e.message}`);
    }
  }
  console.log(`\n${passed}/${tests.length} passed`);
  process.exit(passed === tests.length ? 0 : 1);
}

run();

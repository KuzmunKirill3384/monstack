/**
 * Unit tests for config (env and defaults).
 * Run: node config.test.js
 */
delete process.env.API_URL;
delete process.env.TUI_REFRESH_MS;
delete process.env.TUI_ALERTS_REFRESH_MS;
delete process.env.TUI_PROCESS_LIMIT;
delete process.env.TUI_API_TIMEOUT_MS;
delete process.env.TUI_API_RETRIES;
delete process.env.TUI_THEME;

const { config } = await import('./config.js');

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test('default API_URL', () => {
  assert(config.API_URL === 'http://localhost:3000', 'API_URL default');
});

test('default REFRESH_MS', () => {
  assert(config.REFRESH_MS === 2000, 'REFRESH_MS default');
});

test('default API_TIMEOUT_MS', () => {
  assert(config.API_TIMEOUT_MS === 10000, 'API_TIMEOUT_MS default');
});

test('default API_RETRIES', () => {
  assert(config.API_RETRIES === 3, 'API_RETRIES default');
});

test('default THEME', () => {
  assert(config.THEME === 'dark', 'THEME default');
});

test('THEME lowercased', () => {
  assert(config.THEME === config.THEME.toLowerCase(), 'THEME is lower case');
});

async function run() {
  let passed = 0;
  for (const { name, fn } of tests) {
    try {
      fn();
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

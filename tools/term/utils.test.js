/**
 * Unit tests for utils (sparkline, sortProcs, formatProcRow).
 * Run: node utils.test.js
 */
import { sortProcs, formatProcRow, sparkline } from './utils.js';

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

test('sparkline returns empty for empty array', () => {
  assert(sparkline([]) === '', 'expected empty');
});

test('sparkline returns empty for null', () => {
  assert(sparkline(null) === '', 'expected empty');
});

test('sparkline returns chars for valid numbers', () => {
  const out = sparkline([1, 2, 3, 4, 5], 5);
  assert(out.length === 5, 'expected length 5');
  assert(/^[▁▂▃▄▅▆▇█]+$/.test(out), 'expected spark chars');
});

test('sortProcs sorts by cpu_pct desc', () => {
  const procs = [
    { pid: 2, cpu_pct: 10 },
    { pid: 1, cpu_pct: 20 },
    { pid: 3, cpu_pct: 15 },
  ];
  const r = sortProcs(procs, 'cpu_pct', true);
  assert(r[0].cpu_pct === 20, 'first should be 20');
  assert(r[2].cpu_pct === 10, 'last should be 10');
});

test('sortProcs sorts by name', () => {
  const procs = [
    { pid: 1, name: 'c' },
    { pid: 2, name: 'a' },
    { pid: 3, name: 'b' },
  ];
  const r = sortProcs(procs, 'name', false);
  assert(r[0].name === 'a', 'first should be a');
});

test('formatProcRow formats process', () => {
  const row = formatProcRow({
    pid: 1234,
    name: 'node',
    cpu_pct: 12.5,
    rss_mb: 256,
    state: 'R',
  });
  assert(row[0] === '1234', 'pid');
  assert(row[1] === 'node', 'name');
  assert(row[2] === '12.5', 'cpu');
  assert(row[4] === 'R', 'state');
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

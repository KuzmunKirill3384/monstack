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

test('sparkline returns empty for undefined', () => {
  assert(sparkline(undefined) === '', 'expected empty');
});

test('sparkline returns chars for valid numbers', () => {
  const out = sparkline([1, 2, 3, 4, 5], 5);
  assert(out.length === 5, 'expected length 5');
  assert(/^[▁▂▃▄▅▆▇█]+$/.test(out), 'expected spark chars');
});

test('sparkline single value', () => {
  const out = sparkline([42], 5);
  assert(out.length === 5, `expected length 5, got ${out.length}`);
});

test('sparkline constant values', () => {
  const out = sparkline([5, 5, 5, 5, 5], 5);
  assert(out.length === 5, 'expected length 5');
  const chars = new Set(out.split(''));
  assert(chars.size <= 2, 'constant values should produce same or similar chars');
});

test('sparkline filters NaN', () => {
  const out = sparkline([1, NaN, 3, NaN, 5], 3);
  assert(out.length === 3, `expected length 3, got ${out.length}`);
});

test('sparkline filters non-numbers', () => {
  const out = sparkline([1, 'a', null, 5], 2);
  assert(out.length === 2, `expected length 2, got ${out.length}`);
});

test('sparkline width larger than data', () => {
  const out = sparkline([1, 2], 10);
  assert(out.length === 10, `expected length 10, got ${out.length}`);
});

test('sparkline all zeros', () => {
  const out = sparkline([0, 0, 0], 3);
  assert(out.length === 3, 'expected length 3');
});

test('sparkline negative values', () => {
  const out = sparkline([-10, -5, 0, 5, 10], 5);
  assert(out.length === 5, 'expected length 5');
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

test('sortProcs sorts by cpu_pct asc', () => {
  const procs = [
    { pid: 2, cpu_pct: 10 },
    { pid: 1, cpu_pct: 20 },
    { pid: 3, cpu_pct: 15 },
  ];
  const r = sortProcs(procs, 'cpu_pct', false);
  assert(r[0].cpu_pct === 10, 'first should be 10');
  assert(r[2].cpu_pct === 20, 'last should be 20');
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

test('sortProcs sorts by pid', () => {
  const procs = [
    { pid: 300 },
    { pid: 100 },
    { pid: 200 },
  ];
  const r = sortProcs(procs, 'pid', false);
  assert(r[0].pid === 100, 'first should be 100');
  assert(r[2].pid === 300, 'last should be 300');
});

test('sortProcs sorts by rss_mb', () => {
  const procs = [
    { pid: 1, rss_mb: 256 },
    { pid: 2, rss_mb: 512 },
    { pid: 3, rss_mb: 128 },
  ];
  const r = sortProcs(procs, 'rss_mb', true);
  assert(r[0].rss_mb === 512, 'first should be 512');
});

test('sortProcs empty array', () => {
  const r = sortProcs([], 'cpu_pct', true);
  assert(r.length === 0, 'expected empty');
});

test('sortProcs does not mutate original', () => {
  const procs = [{ pid: 2, cpu_pct: 10 }, { pid: 1, cpu_pct: 20 }];
  const original = [...procs];
  sortProcs(procs, 'cpu_pct', true);
  assert(procs[0].pid === original[0].pid, 'original should not be mutated');
});

test('sortProcs handles null values', () => {
  const procs = [
    { pid: 1, cpu_pct: null },
    { pid: 2, cpu_pct: 10 },
    { pid: 3, cpu_pct: undefined },
  ];
  const r = sortProcs(procs, 'cpu_pct', true);
  assert(r[0].cpu_pct === 10, 'non-null should come first in desc');
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

test('formatProcRow handles nulls', () => {
  const row = formatProcRow({
    pid: 1,
    name: null,
    cpu_pct: null,
    rss_mb: null,
    state: null,
  });
  assert(row[0] === '1', 'pid');
  assert(row[1] === '', 'null name should be empty string');
  assert(row[2] === '0.0', 'null cpu should be 0.0');
  assert(row[3] === '0.0', 'null rss should be 0.0');
  assert(row[4] === '-', 'null state should be -');
});

test('formatProcRow truncates long name', () => {
  const longName = 'x'.repeat(100);
  const row = formatProcRow({ pid: 1, name: longName, cpu_pct: 0, rss_mb: 0, state: 'S' });
  assert(row[1].length <= 36, `name length ${row[1].length} should be <= 36`);
});

test('formatProcRow truncates long state', () => {
  const row = formatProcRow({ pid: 1, name: 'p', cpu_pct: 0, rss_mb: 0, state: 'SLEEPING' });
  assert(row[4].length <= 4, `state length ${row[4].length} should be <= 4`);
});

async function run() {
  let passed = 0;
  for (const { name, fn } of tests) {
    try {
      fn();
      console.log(`  \u2713 ${name}`);
      passed++;
    } catch (e) {
      console.error(`  \u2717 ${name}: ${e.message}`);
    }
  }
  console.log(`\n${passed}/${tests.length} passed`);
  process.exit(passed === tests.length ? 0 : 1);
}

run();

export const SORT_KEYS = ['cpu_pct', 'rss_mb', 'io_read_bps', 'io_write_bps', 'name', 'cmd', 'pid'];

function formatIo(v) {
  if (v == null || v === undefined) return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}G`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

export function sortProcs(procs, sortBy, desc) {
  const key = sortBy || 'cpu_pct';
  const mult = desc ? -1 : 1;
  return [...procs].sort((a, b) => {
    let va = a[key];
    let vb = b[key];
    if (typeof va === 'string') {
      va = (va || '').toLowerCase();
      vb = (vb || '').toLowerCase();
      return mult * (va < vb ? -1 : va > vb ? 1 : 0);
    }
    return mult * ((va ?? 0) - (vb ?? 0));
  });
}

export function formatProcRow(p) {
  const name = (p.name || '').slice(0, 24);
  const cmd = (p.cmd || p.name || '').slice(0, 32);
  return [
    String(p.pid),
    name,
    cmd,
    (p.cpu_pct ?? 0).toFixed(1),
    (p.rss_mb ?? 0).toFixed(1),
    formatIo(p.io_read_bps),
    formatIo(p.io_write_bps),
    (p.state || '—').slice(0, 4),
  ];
}

const SPARK_CHARS = '▁▂▃▄▅▆▇█';

export function sparkline(values, width = 20) {
  if (!values?.length) return '';
  const nums = values.filter((v) => typeof v === 'number' && !Number.isNaN(v));
  if (!nums.length) return '';
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;
  const step = Math.max(1, Math.ceil(nums.length / width));
  let out = '';
  for (let i = 0; i < width; i++) {
    const idx = Math.min(i * step, nums.length - 1);
    const v = nums[idx];
    const pct = (v - min) / range;
    const ci = Math.min(Math.floor(pct * SPARK_CHARS.length), SPARK_CHARS.length - 1);
    out += SPARK_CHARS[ci];
  }
  return out;
}

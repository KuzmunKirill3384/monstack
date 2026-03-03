'use client';

const CHARS = '▁▂▃▄▅▆▇█';

export function Sparkline({
  values,
  width = 24,
  className = '',
}: {
  values: number[];
  width?: number;
  className?: string;
}) {
  if (!values.length) return <span className={className} aria-hidden>—</span>;
  const nums = values.filter((v) => typeof v === 'number' && !Number.isNaN(v));
  if (!nums.length) return <span className={className} aria-hidden>—</span>;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;
  const step = Math.max(1, Math.ceil(nums.length / width));
  let out = '';
  for (let i = 0; i < width; i++) {
    const idx = Math.min(i * step, nums.length - 1);
    const v = nums[idx];
    const pct = (v - min) / range;
    const ci = Math.min(Math.floor(pct * CHARS.length), CHARS.length - 1);
    out += CHARS[ci];
  }
  return (
    <span
      className={`font-mono text-xs ${className}`}
      aria-hidden
      title={nums.map((n) => n.toFixed(1)).join(', ')}
    >
      {out}
    </span>
  );
}

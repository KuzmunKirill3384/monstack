'use client';

import { Button } from '@/components/ui/button';

export type RangePreset = '1h' | '6h' | '24h' | '7d';

interface DateRangePickerProps {
  value: RangePreset;
  onChange: (v: RangePreset) => void;
}

const presets: { label: string; value: RangePreset }[] = [
  { label: '1h', value: '1h' },
  { label: '6h', value: '6h' },
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
];

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  return (
    <div className="flex gap-2">
      {presets.map((p) => (
        <Button
          key={p.value}
          variant={value === p.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(p.value)}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
}

export function rangeToDates(range: RangePreset): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  const h = range === '1h' ? 1 : range === '6h' ? 6 : range === '24h' ? 24 : 24 * 7;
  from.setHours(from.getHours() - h);
  return { from, to };
}

'use client';

import { Sparkline } from './Sparkline';

export function StatPanel({
  title,
  value,
  unit = '',
  values,
  thresholdWarning,
  thresholdCritical,
}: {
  title: string;
  value: number | string;
  unit?: string;
  values?: number[];
  thresholdWarning?: number;
  thresholdCritical?: number;
}) {
  let colorClass = '';
  if (typeof value === 'number' && thresholdCritical != null && value >= thresholdCritical) {
    colorClass = 'text-destructive';
  } else if (typeof value === 'number' && thresholdWarning != null && value >= thresholdWarning) {
    colorClass = 'text-yellow-600 dark:text-yellow-500';
  }
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-muted-foreground mb-1 text-xs font-medium">{title}</h3>
      <div className={`text-2xl font-semibold tabular-nums ${colorClass}`}>
        {typeof value === 'number' ? value.toFixed(1) : value}
        {unit}
      </div>
      {values && values.length > 0 && (
        <div className="mt-2">
          <Sparkline values={values} width={24} className="text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

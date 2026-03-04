'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api, type Host } from '@/lib/api';
import { Button } from '@/components/ui/button';

const DISMISS_KEY = 'monstack-onboarding-dismissed';

export function Onboarding() {
  const [dismissed, setDismissed] = useState(true);
  const { data: hosts = [] } = useQuery<Host[]>({
    queryKey: ['hosts'],
    queryFn: () => api<Host[]>('/hosts'),
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDismissed(localStorage.getItem(DISMISS_KEY) === 'true');
    }
  }, []);

  if (hosts.length > 0) return null;

  const show = !dismissed;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  };

  if (!show) return null;

  const steps = [
    {
      title: 'Connect an agent',
      description: 'Deploy the Monstack agent on your servers. It will send metrics to this backend.',
      link: 'https://github.com/KuzmunKirill3384/monstack#readme',
    },
    {
      title: 'Create an alert rule',
      description: 'Define thresholds (e.g. CPU > 90%) to get notified when metrics cross them.',
      link: '/alerts/rules',
    },
    {
      title: 'Open a dashboard',
      description: 'View overview and host metrics in real time.',
      link: '/dashboards/overview',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4">
      <div className="w-full max-w-lg space-y-8 rounded-xl border bg-card p-6 shadow-lg">
        <h2 className="text-xl font-semibold">Get started with Monstack</h2>
        <ol className="space-y-6">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                {i + 1}
              </span>
              <div>
                <h3 className="font-medium">{step.title}</h3>
                <p className="text-muted-foreground mt-1 text-sm">{step.description}</p>
                {step.link.startsWith('http') ? (
                  <a
                    href={step.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary mt-2 inline-block text-sm underline"
                  >
                    Documentation
                  </a>
                ) : (
                  <Link href={step.link} className="text-primary mt-2 inline-block text-sm underline">
                    Go to {step.link.includes('overview') ? 'Overview' : 'Alert rules'}
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>
        <div className="flex justify-end">
          <Button onClick={handleDismiss}>Go to dashboard</Button>
        </div>
      </div>
    </div>
  );
}

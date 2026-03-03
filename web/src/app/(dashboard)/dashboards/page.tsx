'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const BUILTIN: { id: string; name: string }[] = [
  { id: 'overview', name: 'Overview' },
];

export default function DashboardsPage() {
  const saved = typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('monstack-dashboards') || '[]') as { id: string; name: string }[]) : [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Dashboards</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BUILTIN.map((d) => (
          <Card key={d.id}>
            <CardHeader className="font-medium">{d.name}</CardHeader>
            <CardContent>
              <Link href={`/dashboards/${d.id}`}>
                <Button variant="outline" size="sm">
                  Open
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
        {saved.map((d) => (
          <Card key={d.id}>
            <CardHeader className="font-medium">{d.name}</CardHeader>
            <CardContent>
              <Link href={`/dashboards/${d.id}`}>
                <Button variant="outline" size="sm">
                  Open
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r bg-muted/30 p-4">
        <nav className="flex flex-col gap-2">
          <Link href="/hosts">
            <Button variant="ghost" className="w-full justify-start">
              Hosts
            </Button>
          </Link>
          <Link href="/alerts">
            <Button variant="ghost" className="w-full justify-start">
              Alerts
            </Button>
          </Link>
          <Link href="/alerts/rules">
            <Button variant="ghost" className="w-full justify-start">
              Alert rules
            </Button>
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

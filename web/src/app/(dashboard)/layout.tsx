'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { TopBar } from '@/components/TopBar';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, authChecked, logout, isAnonymous } = useAuth();

  useEffect(() => {
    if (authChecked && user === null) {
      router.replace('/login');
    }
  }, [authChecked, user, router]);

  if (authChecked && user === null) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <div className="flex flex-1">
      <aside className="w-56 border-r bg-muted/30 p-4 flex flex-col shrink-0">
        <div className="flex items-center justify-between gap-2 pb-2">
          <span className="text-sm font-medium">Menu</span>
          <ThemeToggle />
        </div>
        <nav className="flex flex-col gap-2 flex-1">
          <Link href="/dashboards">
            <Button variant="ghost" className="w-full justify-start">
              Dashboards
            </Button>
          </Link>
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
        {!isAnonymous && user && (
          <div className="mt-auto pt-2 border-t">
            <span className="text-muted-foreground text-sm block truncate px-2">
              {user.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => logout().then(() => router.replace('/login'))}
            >
              Sign out
            </Button>
          </div>
        )}
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

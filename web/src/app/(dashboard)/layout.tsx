'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { TopBar } from '@/components/TopBar';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';
import { Onboarding } from '@/components/Onboarding';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, authChecked, logout, isAnonymous } = useAuth();

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const segment = pathname.split('/').filter(Boolean);
    const titleMap: Record<string, string> = {
      hosts: 'Hosts',
      dashboards: 'Dashboards',
      alerts: segment[1] === 'rules' ? 'Alert rules' : 'Alerts',
      settings: 'Settings',
    };
    const base = segment[0] ?? '';
    const pageTitle = titleMap[base] ?? (segment[1] ? `${base} · Monstack` : 'Monstack');
    document.title = `${pageTitle} · Monstack`;
  }, [pathname]);

  const navItems = [
    { href: '/dashboards', label: 'Dashboards' },
    { href: '/hosts', label: 'Hosts' },
    { href: '/alerts', label: 'Alerts' },
    { href: '/alerts/rules', label: 'Alert rules' },
    { href: '/settings', label: 'Settings' },
  ] as const;

  useEffect(() => {
    if (authChecked && user === null) {
      const returnUrl = encodeURIComponent(pathname);
      router.replace(`/login?returnUrl=${returnUrl}`);
    }
  }, [authChecked, user, router, pathname]);

  if (authChecked && user === null) {
    return null;
  }

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between gap-2 pb-2">
        <Link href="/hosts" className="font-semibold text-foreground hover:text-foreground">
          Monstack
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-2" aria-label="Main">
        {navItems.map(({ href, label }) => {
          const active =
            pathname === href ||
            (href !== '/alerts' && href !== '/settings' && pathname.startsWith(href + '/'));
          return (
            <Link key={href} href={href}>
              <Button
                variant={active ? 'secondary' : 'ghost'}
                className={cn('w-full justify-start', active && 'bg-muted')}
              >
                {label}
              </Button>
            </Link>
          );
        })}
        <a
          href="https://github.com/KuzmunKirill3384/monstack#readme"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2"
        >
          <Button variant="ghost" className="w-full justify-start text-muted-foreground">
            Documentation
          </Button>
        </a>
      </nav>
      {!isAnonymous && user && (
        <div className="mt-auto border-t pt-2">
          <span className="text-muted-foreground block truncate px-2 text-sm">
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
    </>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex items-center gap-2 border-b bg-muted/20 px-4 py-2 md:hidden">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="size-4" />
        </Button>
        <span className="font-semibold">Monstack</span>
      </div>
      <TopBar />
      <div className="flex flex-1">
        <aside
          className={cn(
            'flex w-56 shrink-0 flex-col border-r bg-muted/30 p-4',
            'fixed inset-y-0 left-0 z-50 transform transition-transform md:relative md:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {sidebarContent}
        </aside>
        {sidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            aria-label="Close menu"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <main className="min-w-0 flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
      <Onboarding />
    </div>
  );
}

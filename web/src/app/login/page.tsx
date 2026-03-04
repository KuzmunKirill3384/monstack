'use client';

import { Suspense, useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const ALLOWED_RETURN_PREFIXES = ['/hosts', '/dashboards', '/alerts', '/settings'];

function isValidReturnUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    const path = decodeURIComponent(url);
    if (!path.startsWith('/') || path.startsWith('//')) return false;
    return ALLOWED_RETURN_PREFIXES.some((p) => path === p || path.startsWith(p + '/'));
  } catch {
    return false;
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrlParam = searchParams.get('returnUrl');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const target = isValidReturnUrl(returnUrlParam) ? decodeURIComponent(returnUrlParam!) : '/hosts';
      router.push(target);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="text-center text-xl font-semibold">Monstack</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              aria-invalid={!!error}
              aria-describedby={error ? 'login-error' : undefined}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              aria-invalid={!!error}
              aria-describedby={error ? 'login-error' : undefined}
            />
          </div>
          {error && (
            <p
              id="login-error"
              ref={errorRef}
              className="text-sm text-destructive"
              role="alert"
              aria-live="polite"
              tabIndex={-1}
            >
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
          <p className="text-center text-sm">
            <Link
              href="#"
              className="text-muted-foreground hover:text-foreground underline"
              aria-label="Forgot password (not yet implemented)"
            >
              Forgot password?
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-muted/30">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}

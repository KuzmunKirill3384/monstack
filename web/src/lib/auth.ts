export async function login(email: string, password: string): Promise<void> {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Login failed');
  }
}

export async function logout(): Promise<void> {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

export async function getMe(): Promise<{ id: string; email: string } | null> {
  if (typeof window === 'undefined') return null;
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
  const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

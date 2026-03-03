import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';

vi.mock('@/lib/auth', () => ({
  getMe: vi.fn(),
  logout: vi.fn(),
}));

const { getMe } = await import('@/lib/auth');

describe('useAuth', () => {
  beforeEach(() => {
    vi.mocked(getMe).mockReset();
  });

  it('sets isAuthenticated when getMe returns user', async () => {
    vi.mocked(getMe).mockResolvedValue({ id: 'u1', email: 'u@test.com' });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.authChecked).toBe(true);
    });

    expect(result.current.user).toEqual({ id: 'u1', email: 'u@test.com' });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isAnonymous).toBe(false);
  });

  it('sets anonymous when getMe returns anonymous', async () => {
    vi.mocked(getMe).mockResolvedValue({ id: 'anonymous', email: 'anonymous' });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.authChecked).toBe(true);
    });

    expect(result.current.isAnonymous).toBe(true);
  });

  it('exposes refresh and logout', () => {
    vi.mocked(getMe).mockResolvedValue(null);

    const { result } = renderHook(() => useAuth());

    expect(typeof result.current.refresh).toBe('function');
    expect(typeof result.current.logout).toBe('function');
  });
});

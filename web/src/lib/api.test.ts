import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from './api';

describe('api', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('calls fetch with credentials include', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
      text: () => Promise.resolve(''),
    } as Response);

    await api('/hosts');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/hosts'),
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('throws on 401', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    } as Response);

    await expect(api('/hosts')).rejects.toThrow('Unauthorized');
  });

  it('throws on non-ok response', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Server Error'),
    } as Response);

    await expect(api('/hosts')).rejects.toThrow();
  });

  it('returns json on 200', async () => {
    const data = [{ id: 'h1', name: 'host1' }];
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(''),
    } as Response);

    const result = await api<typeof data>('/hosts');
    expect(result).toEqual(data);
  });
});

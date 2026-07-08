import { describe, expect, it, vi, afterEach } from 'vitest';
import { checkHealth } from './client';

describe('api client without window', () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    vi.stubGlobal('window', originalWindow);
    vi.restoreAllMocks();
  });

  it('uses localhost fallback when window is unavailable', async () => {
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));

    await expect(checkHealth('')).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledWith('http://localhost/health');
  });
});

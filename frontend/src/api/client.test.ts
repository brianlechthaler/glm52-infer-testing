import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../lib/settings';
import { checkHealth, fetchModels, streamChatCompletion } from './client';

describe('api client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses explicit api base url', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    await expect(checkHealth('http://example.com')).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledWith('http://example.com/health');
  });

  it('checks health', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    await expect(checkHealth('')).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/health');
  });

  it('returns false when health fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(checkHealth('')).resolves.toBe(false);
  });

  it('fetches models', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ id: 'glm-5.2' }] }),
      }),
    );
    const models = await fetchModels('');
    expect(models).toEqual([{ id: 'glm-5.2' }]);
    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/v1/models');
  });

  it('throws when models request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(fetchModels('')).rejects.toThrow('Failed to fetch models');
  });

  it('streams chat completion deltas', async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n'));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body }));

    const deltas = [];
    for await (const delta of streamChatCompletion('', DEFAULT_SETTINGS, [
      { role: 'user', content: 'hello' },
    ])) {
      deltas.push(delta);
    }

    expect(deltas).toEqual([{ content: 'Hi', done: false }, { done: true }]);
  });

  it('throws when stream response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 400, statusText: 'Bad Request' }),
    );
    const iterator = streamChatCompletion('', DEFAULT_SETTINGS, [
      { role: 'user', content: 'hello' },
    ]);
    await expect(iterator.next()).rejects.toThrow('Chat request failed');
  });

  it('throws when response has no body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body: null }));
    const iterator = streamChatCompletion('', DEFAULT_SETTINGS, [
      { role: 'user', content: 'hello' },
    ]);
    await expect(iterator.next()).rejects.toThrow('No response body');
  });
});

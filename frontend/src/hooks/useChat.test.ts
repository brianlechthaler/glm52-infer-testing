import { describe, expect, it, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat } from './useChat';
import { DEFAULT_SETTINGS } from '../lib/settings';
import * as client from '../api/client';

describe('useChat', () => {
  it('sends a message and streams assistant reply', async () => {
    async function* mockStream() {
      yield { content: 'Hello', done: false };
      yield { done: true };
    }

    vi.spyOn(client, 'streamChatCompletion').mockReturnValue(mockStream());

    const { result } = renderHook(() => useChat(DEFAULT_SETTINGS));

    await act(async () => {
      await result.current.sendMessage('Hi');
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });

    expect(result.current.messages[0]).toMatchObject({ role: 'user', content: 'Hi' });
    expect(result.current.messages[1]).toMatchObject({ role: 'assistant', content: 'Hello' });
    expect(result.current.isStreaming).toBe(false);
  });

  it('captures streaming errors', async () => {
    vi.spyOn(client, 'streamChatCompletion').mockImplementation(async function* () {
      throw new Error('boom');
      yield { done: true };
    });

    const { result } = renderHook(() => useChat(DEFAULT_SETTINGS));

    await act(async () => {
      await result.current.sendMessage('Hi');
    });

    expect(result.current.error).toBe('boom');
    expect(result.current.isStreaming).toBe(false);
  });

  it('skips empty messages and concurrent sends', async () => {
    const { result } = renderHook(() => useChat(DEFAULT_SETTINGS));

    await act(async () => {
      await result.current.sendMessage('   ');
    });
    expect(result.current.messages).toHaveLength(0);

    let resolveStream: (() => void) | undefined;
    const streamPromise = new Promise<void>((resolve) => {
      resolveStream = resolve;
    });

    vi.spyOn(client, 'streamChatCompletion').mockImplementation(async function* () {
      await streamPromise;
      yield { content: 'Later', done: false };
      yield { done: true };
    });

    await act(async () => {
      void result.current.sendMessage('First');
    });

    await act(async () => {
      await result.current.sendMessage('Second');
    });

    resolveStream?.();
    await act(async () => {
      await streamPromise;
    });

    expect(result.current.messages.filter((m) => m.role === 'user')).toHaveLength(1);
  });

  it('tracks reasoning and usage deltas', async () => {
    async function* mockStream() {
      yield { reasoning: 'hmm', done: false };
      yield { content: 'Answer', done: false };
      yield {
        done: false,
        usage: { completionTokens: 20, promptTokens: 5, totalTokens: 25 },
      };
      yield { done: true };
    }

    vi.spyOn(client, 'streamChatCompletion').mockReturnValue(mockStream());
    const { result } = renderHook(() => useChat(DEFAULT_SETTINGS));

    await act(async () => {
      await result.current.sendMessage('Why?');
    });

    expect(result.current.messages[1]).toMatchObject({
      role: 'assistant',
      reasoning: 'hmm',
      content: 'Answer',
    });
    expect(result.current.tokenRate.totalTokens).toBeGreaterThan(0);
  });

  it('appends follow-up reasoning chunks', async () => {
    async function* mockStream() {
      yield { reasoning: 'part1', done: false };
      yield { reasoning: ' part2', done: false };
      yield { done: true };
    }

    vi.spyOn(client, 'streamChatCompletion').mockReturnValue(mockStream());
    const { result } = renderHook(() => useChat(DEFAULT_SETTINGS));

    await act(async () => {
      await result.current.sendMessage('Why?');
    });

    expect(result.current.messages[1].reasoning).toBe('part1 part2');
  });

  it('handles unknown streaming failures', async () => {
    vi.spyOn(client, 'streamChatCompletion').mockImplementation(async function* () {
      throw 'broken';
      yield { done: true };
    });

    const { result } = renderHook(() => useChat(DEFAULT_SETTINGS));

    await act(async () => {
      await result.current.sendMessage('Hi');
    });

    expect(result.current.error).toBe('Unknown streaming error');
  });

  it('updates assistant content without changing reasoning', async () => {
    async function* mockStream() {
      yield { reasoning: 'thought', done: false };
      yield { content: 'Answer', done: false };
      yield { done: true };
    }

    vi.spyOn(client, 'streamChatCompletion').mockReturnValue(mockStream());
    const { result } = renderHook(() => useChat(DEFAULT_SETTINGS));

    await act(async () => {
      await result.current.sendMessage('Explain');
    });

    expect(result.current.messages[1]).toMatchObject({
      reasoning: 'thought',
      content: 'Answer',
    });
  });

  it('clears chat history', async () => {
    async function* mockStream() {
      yield { content: 'Hello', done: false };
      yield { done: true };
    }

    vi.spyOn(client, 'streamChatCompletion').mockReturnValue(mockStream());
    const { result } = renderHook(() => useChat(DEFAULT_SETTINGS));

    await act(async () => {
      await result.current.sendMessage('Hi');
    });

    act(() => {
      result.current.clearChat();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});

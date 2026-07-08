import type { AppSettings, MessageRole, StreamDelta } from '../types';
import { settingsToRequest } from '../lib/settings';
import { readSseStream } from '../lib/stream';

function apiUrl(base: string, path: string): string {
  const prefix = base.replace(/\/$/, '');
  if (prefix) {
    return `${prefix}${path}`;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return new URL(path, window.location.origin).href;
  }

  return `http://localhost${path}`;
}

export async function checkHealth(apiBaseUrl: string): Promise<boolean> {
  const response = await fetch(apiUrl(apiBaseUrl, '/health'));
  return response.ok;
}

export async function fetchModels(apiBaseUrl: string): Promise<Array<{ id: string }>> {
  const response = await fetch(apiUrl(apiBaseUrl, '/v1/models'));
  if (!response.ok) {
    throw new Error('Failed to fetch models');
  }

  const payload = (await response.json()) as { data: Array<{ id: string }> };
  return payload.data;
}

export async function* streamChatCompletion(
  apiBaseUrl: string,
  settings: AppSettings,
  messages: Array<{ role: MessageRole; content: string }>,
): AsyncGenerator<StreamDelta> {
  const response = await fetch(apiUrl(apiBaseUrl, '/v1/chat/completions'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settingsToRequest(settings, messages)),
  });

  if (!response.ok) {
    throw new Error(`Chat request failed: ${response.status} ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('No response body');
  }

  const reader = response.body.getReader();
  yield* readSseStream(reader);
}

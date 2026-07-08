import type { StreamDelta } from '../types';

export interface SseLine {
  type: 'data';
  payload: string;
}

export function parseSseLine(line: string): SseLine | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith(':')) {
    return null;
  }

  if (trimmed.startsWith('data:')) {
    return { type: 'data', payload: trimmed.slice(5).trim() };
  }

  return null;
}

export function parseSseChunk(payload: string): StreamDelta | null {
  if (payload === '[DONE]') {
    return { done: true };
  }

  try {
    const parsed = JSON.parse(payload) as {
      choices?: Array<{
        delta?: { content?: string; reasoning_content?: string };
        finish_reason?: string | null;
      }>;
      usage?: {
        completion_tokens?: number;
        prompt_tokens?: number;
        total_tokens?: number;
      };
    };

    const choice = parsed.choices?.[0];
    const delta: StreamDelta = { done: false };

    if (choice?.delta?.content) {
      delta.content = choice.delta.content;
    }

    if (choice?.delta?.reasoning_content) {
      delta.reasoning = choice.delta.reasoning_content;
    }

    if (choice?.finish_reason) {
      delta.done = true;
    }

    if (parsed.usage) {
      delta.usage = {
        completionTokens: parsed.usage.completion_tokens,
        promptTokens: parsed.usage.prompt_tokens,
        totalTokens: parsed.usage.total_tokens,
      };
    }

    if (delta.content || delta.reasoning || delta.usage || delta.done) {
      return delta;
    }

    return null;
  } catch {
    return null;
  }
}

export async function* readSseStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<StreamDelta> {
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      buffer += decoder.decode();
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const parsedLine = parseSseLine(line);
      if (!parsedLine) {
        continue;
      }

      const chunk = parseSseChunk(parsedLine.payload);
      if (chunk) {
        yield chunk;
      }
    }
  }

  if (buffer.trim()) {
    const parsedLine = parseSseLine(buffer);
    if (parsedLine) {
      const chunk = parseSseChunk(parsedLine.payload);
      if (chunk) {
        yield chunk;
      }
    }
  }
}

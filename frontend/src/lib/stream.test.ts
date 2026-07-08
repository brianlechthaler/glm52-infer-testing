import { describe, expect, it } from 'vitest';
import { parseSseLine, parseSseChunk } from './stream';

describe('parseSseLine', () => {
  it('parses data lines', () => {
    expect(parseSseLine('data: {"x":1}')).toEqual({ type: 'data', payload: '{"x":1}' });
  });

  it('ignores empty and comment lines', () => {
    expect(parseSseLine('')).toBeNull();
    expect(parseSseLine(': ping')).toBeNull();
    expect(parseSseLine('event: message')).toBeNull();
  });
});

describe('parseSseChunk', () => {
  it('parses content delta', () => {
    const delta = parseSseChunk('{"choices":[{"delta":{"content":"hi"},"finish_reason":null}]}');
    expect(delta).toEqual({ content: 'hi', done: false });
  });

  it('parses reasoning delta', () => {
    const delta = parseSseChunk(
      '{"choices":[{"delta":{"reasoning_content":"think"},"finish_reason":null}]}',
    );
    expect(delta).toEqual({ reasoning: 'think', done: false });
  });

  it('marks done for [DONE]', () => {
    expect(parseSseChunk('[DONE]')).toEqual({ done: true });
  });

  it('parses usage from final chunk', () => {
    const delta = parseSseChunk(
      '{"choices":[],"usage":{"completion_tokens":12,"prompt_tokens":3,"total_tokens":15}}',
    );
    expect(delta).toEqual({
      done: false,
      usage: { completionTokens: 12, promptTokens: 3, totalTokens: 15 },
    });
  });

  it('returns null for invalid json', () => {
    expect(parseSseChunk('not-json')).toBeNull();
  });

  it('marks done when finish_reason is set', () => {
    const delta = parseSseChunk('{"choices":[{"delta":{},"finish_reason":"stop"}]}');
    expect(delta).toEqual({ done: true });
  });
});

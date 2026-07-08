import { describe, expect, it } from 'vitest';
import { readSseStream } from './stream';

describe('readSseStream', () => {
  it('yields parsed deltas from a readable stream', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"A"}}]}\n\n'));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    const reader = stream.getReader();
    const deltas = [];
    for await (const delta of readSseStream(reader)) {
      deltas.push(delta);
    }

    expect(deltas).toEqual([{ content: 'A', done: false }, { done: true }]);
  });

  it('yields deltas when the stream omits a trailing newline', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"tail"}}]}'));
        controller.close();
      },
    });

    const reader = stream.getReader();
    const deltas = [];
    for await (const delta of readSseStream(reader)) {
      deltas.push(delta);
    }

    expect(deltas).toEqual([{ content: 'tail', done: false }]);
  });
});

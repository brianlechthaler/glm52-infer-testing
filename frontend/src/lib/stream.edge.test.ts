import { describe, expect, it } from 'vitest';
import { parseSseChunk } from './stream';

describe('parseSseChunk edge cases', () => {
  it('returns null when chunk has no usable fields', () => {
    expect(parseSseChunk('{"choices":[{"delta":{},"finish_reason":null}]}')).toBeNull();
  });
});

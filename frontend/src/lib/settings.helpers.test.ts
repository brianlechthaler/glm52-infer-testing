import { describe, expect, it } from 'vitest';
import { formatStopInput, parseStopInput } from './settings';

describe('stop helpers', () => {
  it('parses comma-separated stop sequences', () => {
    expect(parseStopInput(' END,STOP , ')).toEqual(['END', 'STOP']);
  });

  it('formats stop sequences', () => {
    expect(formatStopInput(['END', 'STOP'])).toBe('END, STOP');
  });
});

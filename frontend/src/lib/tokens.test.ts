import { describe, expect, it } from 'vitest';
import { estimateTokens, TokenRateTracker } from './tokens';

describe('estimateTokens', () => {
  it('returns 0 for empty text', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('estimates tokens from text length', () => {
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abcdefgh')).toBe(2);
  });
});

describe('TokenRateTracker', () => {
  it('returns zero before streaming starts', () => {
    const tracker = new TokenRateTracker();
    expect(tracker.snapshot().tokensPerSecond).toBe(0);
    expect(tracker.snapshot().totalTokens).toBe(0);
  });

  it('tracks token rate over time', () => {
    let now = 1000;
    const tracker = new TokenRateTracker(() => now);
    tracker.start();
    now = 3000;
    tracker.addTokens(10);
    const snapshot = tracker.snapshot();
    expect(snapshot.totalTokens).toBe(10);
    expect(snapshot.elapsedSeconds).toBe(2);
    expect(snapshot.tokensPerSecond).toBe(5);
  });

  it('resets on start', () => {
    const tracker = new TokenRateTracker(() => 1000);
    tracker.start();
    tracker.addTokens(5);
    tracker.start();
    expect(tracker.snapshot().totalTokens).toBe(0);
  });

  it('adds estimated tokens from text', () => {
    const tracker = new TokenRateTracker(() => 1000);
    tracker.start();
    tracker.addText('abcdefgh');
    expect(tracker.snapshot().totalTokens).toBe(2);
  });
});

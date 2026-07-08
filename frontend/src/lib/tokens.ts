import type { TokenRateSnapshot } from '../types';

export function estimateTokens(text: string): number {
  if (!text) {
    return 0;
  }
  return Math.max(1, Math.ceil(text.length / 4));
}

export class TokenRateTracker {
  private totalTokens = 0;
  private startMs: number | null = null;

  constructor(private readonly now: () => number = () => Date.now()) {}

  start(): void {
    this.totalTokens = 0;
    this.startMs = this.now();
  }

  addTokens(count: number): void {
    if (count > 0) {
      this.totalTokens += count;
    }
  }

  addText(text: string): void {
    this.addTokens(estimateTokens(text));
  }

  snapshot(): TokenRateSnapshot {
    if (this.startMs === null || this.totalTokens === 0) {
      return { tokensPerSecond: 0, totalTokens: this.totalTokens, elapsedSeconds: 0 };
    }

    const elapsedSeconds = Math.max((this.now() - this.startMs) / 1000, 0.001);
    return {
      tokensPerSecond: this.totalTokens / elapsedSeconds,
      totalTokens: this.totalTokens,
      elapsedSeconds,
    };
  }
}

export function formatTokenRate(rate: number): string {
  if (rate <= 0) {
    return '—';
  }
  return `${rate.toFixed(1)} tok/s`;
}

import { formatTokenRate } from '../lib/tokens';

interface TokenRateProps {
  tokensPerSecond: number;
  totalTokens: number;
  isStreaming: boolean;
}

export function TokenRate({ tokensPerSecond, totalTokens, isStreaming }: TokenRateProps) {
  return (
    <div className="token-rate" aria-live="polite">
      <span className="token-rate__value">{formatTokenRate(tokensPerSecond)}</span>
      {isStreaming && <span className="token-rate__count">{totalTokens} tokens</span>}
    </div>
  );
}

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TokenRate } from './TokenRate';

describe('TokenRate', () => {
  it('renders placeholder when idle', () => {
    render(<TokenRate tokensPerSecond={0} totalTokens={0} isStreaming={false} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders live rate while streaming', () => {
    render(<TokenRate tokensPerSecond={12.34} totalTokens={50} isStreaming={true} />);
    expect(screen.getByText('12.3 tok/s')).toBeInTheDocument();
    expect(screen.getByText('50 tokens')).toBeInTheDocument();
  });
});

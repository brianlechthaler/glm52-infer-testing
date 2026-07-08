import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatPage } from './ChatPage';
import { DEFAULT_SETTINGS } from '../lib/settings';
import * as client from '../api/client';

vi.mock('../hooks/useChat', () => ({
  useChat: () => ({
    messages: [],
    isStreaming: false,
    error: 'Something failed',
    tokenRate: { tokensPerSecond: 0, totalTokens: 0 },
    sendMessage: vi.fn(),
    clearChat: vi.fn(),
  }),
}));

describe('ChatPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows offline status and errors', async () => {
    vi.spyOn(client, 'checkHealth').mockResolvedValue(false);

    render(<ChatPage settings={DEFAULT_SETTINGS} />);

    expect(await screen.findByText('Offline')).toBeInTheDocument();
    expect(screen.getByText('Something failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });
});

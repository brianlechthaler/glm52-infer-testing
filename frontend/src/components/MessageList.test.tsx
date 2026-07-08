import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageList } from './MessageList';

describe('MessageList', () => {
  it('shows empty state', () => {
    render(<MessageList messages={[]} />);
    expect(screen.getByText(/Start a conversation/)).toBeInTheDocument();
  });

  it('renders messages with reasoning', () => {
    render(
      <MessageList
        messages={[
          { id: '1', role: 'user', content: 'Hi' },
          {
            id: '2',
            role: 'assistant',
            content: 'Hello',
            reasoning: 'Thinking deeply',
          },
        ]}
      />,
    );

    expect(screen.getByText('Hi')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Thinking deeply')).toBeInTheDocument();
  });
});

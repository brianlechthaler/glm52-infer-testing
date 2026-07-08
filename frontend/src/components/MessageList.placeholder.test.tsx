import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageList } from './MessageList';

describe('MessageList assistant placeholder', () => {
  it('shows ellipsis for empty assistant content', () => {
    render(<MessageList messages={[{ id: '1', role: 'assistant', content: '' }]} />);

    expect(screen.getByText('…')).toBeInTheDocument();
  });
});

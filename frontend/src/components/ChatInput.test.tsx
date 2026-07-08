import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInput } from './ChatInput';

describe('ChatInput', () => {
  afterEach(() => {
    cleanup();
  });

  it('submits trimmed messages', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn().mockResolvedValue(undefined);

    render(<ChatInput disabled={false} onSend={onSend} />);
    await user.type(screen.getByPlaceholderText('Message the model...'), '  hello  ');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(onSend).toHaveBeenCalledWith('hello');
    expect(screen.getByPlaceholderText('Message the model...')).toHaveValue('');
  });

  it('ignores whitespace-only submit events', () => {
    const onSend = vi.fn().mockResolvedValue(undefined);

    render(<ChatInput disabled={false} onSend={onSend} />);
    fireEvent.change(screen.getByPlaceholderText('Message the model...'), {
      target: { value: '   ' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Send' }).closest('form')!);

    expect(onSend).not.toHaveBeenCalled();
  });

  it('disables input while streaming', () => {
    const onSend = vi.fn().mockResolvedValue(undefined);

    render(<ChatInput disabled={true} onSend={onSend} />);
    expect(screen.getByPlaceholderText('Message the model...')).toBeDisabled();
  });
});

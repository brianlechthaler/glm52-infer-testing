import { useState, type FormEvent } from 'react';

interface ChatInputProps {
  disabled: boolean;
  onSend: (message: string) => Promise<void>;
}

export function ChatInput({ disabled, onSend }: ChatInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const message = value.trim();
    if (!message) {
      return;
    }

    setValue('');
    await onSend(message);
  };

  return (
    <form className="chat-input" onSubmit={(event) => void handleSubmit(event)}>
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Message the model..."
        rows={3}
        disabled={disabled}
      />
      <button type="submit" disabled={disabled || !value.trim()}>
        Send
      </button>
    </form>
  );
}

import type { ChatMessage } from '../types';

interface MessageListProps {
  messages: ChatMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="empty-state">
        <p>Start a conversation with your local GLM 5.2 model.</p>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((message) => (
        <article key={message.id} className={`message message--${message.role}`}>
          <header className="message__role">{message.role}</header>
          {message.reasoning ? (
            <details className="message__reasoning">
              <summary>Reasoning</summary>
              <pre>{message.reasoning}</pre>
            </details>
          ) : null}
          <div className="message__content">{message.content || '…'}</div>
        </article>
      ))}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { checkHealth } from '../api/client';
import { ChatInput } from '../components/ChatInput';
import { MessageList } from '../components/MessageList';
import { TokenRate } from '../components/TokenRate';
import type { AppSettings } from '../types';
import { useChat } from '../hooks/useChat';

interface ChatPageProps {
  settings: AppSettings;
}

export function ChatPage({ settings }: ChatPageProps) {
  const { messages, isStreaming, error, tokenRate, sendMessage, clearChat } = useChat(settings);
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      const healthy = await checkHealth(settings.apiBaseUrl);
      if (active) {
        setOnline(healthy);
      }
    };

    void refresh();
    const interval = window.setInterval(() => void refresh(), 15000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [settings.apiBaseUrl]);

  return (
    <section className="chat-page">
      <header className="page-header">
        <div>
          <h1>GLM 5.2 Chat</h1>
          <p className="status">
            Server:{' '}
            <span className={online ? 'status--online' : 'status--offline'}>
              {online === null ? 'Checking…' : online ? 'Online' : 'Offline'}
            </span>
          </p>
        </div>
        <div className="page-header__actions">
          <TokenRate
            tokensPerSecond={tokenRate.tokensPerSecond}
            totalTokens={tokenRate.totalTokens}
            isStreaming={isStreaming}
          />
          <button type="button" onClick={clearChat} disabled={isStreaming || messages.length === 0}>
            Clear
          </button>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <MessageList messages={messages} />
      <ChatInput disabled={isStreaming || online === false} onSend={sendMessage} />
    </section>
  );
}

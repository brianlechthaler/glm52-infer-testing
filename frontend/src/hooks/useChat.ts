import { useCallback, useRef, useState } from 'react';
import { streamChatCompletion } from '../api/client';
import type { AppSettings, ChatMessage } from '../types';
import { TokenRateTracker } from '../lib/tokens';

function createId(): string {
  return crypto.randomUUID();
}

export function useChat(settings: AppSettings) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenRate, setTokenRate] = useState({ tokensPerSecond: 0, totalTokens: 0 });
  const trackerRef = useRef(new TokenRateTracker());

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isStreaming) {
        return;
      }

      const userMessage: ChatMessage = {
        id: createId(),
        role: 'user',
        content: trimmed,
      };

      const assistantId = createId();
      const history = [...messages, userMessage];
      const requestMessages = history.map(({ role, content: text }) => ({
        role,
        content: text,
      }));

      setMessages([...history, { id: assistantId, role: 'assistant', content: '' }]);
      setError(null);
      setIsStreaming(true);
      trackerRef.current.start();
      setTokenRate({ tokensPerSecond: 0, totalTokens: 0 });

      try {
        for await (const delta of streamChatCompletion(
          settings.apiBaseUrl,
          settings,
          requestMessages,
        )) {
          if (delta.content) {
            trackerRef.current.addText(delta.content);
          }
          if (delta.reasoning) {
            trackerRef.current.addText(delta.reasoning);
          }
          if (delta.usage?.completionTokens) {
            trackerRef.current.addTokens(delta.usage.completionTokens);
          }

          const snapshot = trackerRef.current.snapshot();
          setTokenRate({
            tokensPerSecond: snapshot.tokensPerSecond,
            totalTokens: snapshot.totalTokens,
          });

          if (delta.content || delta.reasoning) {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId
                  ? {
                      ...message,
                      content: delta.content ? message.content + delta.content : message.content,
                      reasoning: delta.reasoning
                        ? (message.reasoning ?? '') + delta.reasoning
                        : message.reasoning,
                    }
                  : message,
              ),
            );
          }
        }
      } catch (streamError) {
        const message =
          streamError instanceof Error ? streamError.message : 'Unknown streaming error';
        setError(message);
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, messages, settings],
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    setTokenRate({ tokensPerSecond: 0, totalTokens: 0 });
  }, []);

  return {
    messages,
    isStreaming,
    error,
    tokenRate,
    sendMessage,
    clearChat,
  };
}

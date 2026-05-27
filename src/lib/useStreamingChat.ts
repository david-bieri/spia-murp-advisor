// src/lib/useStreamingChat.ts
// Phase 3: streaming fetch hook with structured-output placeholder detection
//
// __BUILDING_PLAN__ sentinel: when accumulated content starts with
// '{"type":"DEGREE', show a placeholder instead of streaming raw JSON.
// Card renders when [DONE] fires and tryParseStructured() succeeds in Message.tsx.

import { useState, useCallback, useRef } from 'react';

export type Message = {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];   // KB files used — attached at stream completion
  clientOnly?: boolean;
};

// Sentinel shown while a structured JSON response is accumulating.
// ChatWindow.tsx watches for this string and shows BuildingPlanIndicator.
export const BUILDING_PLAN_SENTINEL = '__BUILDING_PLAN__';

type Options = {
  topic: string;
  campus: string | null;
};

export function useStreamingChat({ topic, campus }: Options) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (userText: string) => {
      // Apply campus prefix (mirrors the applyCampusPrefix logic from page.tsx)
      const campusLabel = campus === 'blacksburg' ? 'Blacksburg' : 'Arlington';
      const prefixedContent =
        campus ? `[Campus: ${campusLabel}] ${userText}` : userText;

      const newUser: Message = { role: 'user', content: prefixedContent };

      // Build API history: exclude clientOnly messages (escalation etc.)
      const historyForApi = [...messages, newUser].filter((m) => !m.clientOnly);

      // Add user message + empty assistant placeholder to UI immediately
      setMessages((prev) => [
        ...prev,
        newUser,
        { role: 'assistant', content: '' },
      ]);
      setIsLoading(true);

      // Cancel any in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: historyForApi, topic, campus }),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer      = '';
        let accumulated = '';
        let sourcesData: string[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // SSE messages separated by '\n\n'
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';

          for (const part of parts) {
            const line = part.replace(/^data: /, '').trim();
            if (!line || line === '[DONE]') continue;

            try {
              const parsed = JSON.parse(line);

              if (parsed.error) {
                accumulated += '\n\n_(Jane encountered an error. Please try again.)_';
              } else if (parsed.text) {
                accumulated += parsed.text;
              } else if (parsed.sources) {
                sourcesData = parsed.sources;
              }

              // Detect structured output accumulating — show sentinel instead of raw JSON
              const isStructured = accumulated.trimStart().startsWith('{"type":"DEGREE');
              const displayContent = isStructured ? BUILDING_PLAN_SENTINEL : accumulated;

              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { role: 'assistant', content: displayContent };
                return next;
              });
            } catch {
              // Malformed SSE chunk — skip silently
            }
          }
        }

        // Stream complete — set final content with sources
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: 'assistant',
            content: accumulated,
            ...(sourcesData.length > 0 && { sources: sourcesData }),
          };
          return next;
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;

        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: 'assistant',
            content: '_Jane timed out. Please try again._',
          };
          return next;
        });
      } finally {
        setIsLoading(false);
      }
    },
    [messages, topic, campus]
  );

  const clearMessages = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
  }, []);

  return { messages, setMessages, sendMessage, isLoading, clearMessages };
}

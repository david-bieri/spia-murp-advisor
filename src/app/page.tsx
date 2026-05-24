"use client";

import { useState } from "react";
import Sidebar, { Campus, Topic } from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import type { MessageData } from "@/components/Message";
import { OPENING_MESSAGE } from "@/lib/opening-message";

const CAMPUS_PREFIX = /^\[Campus:\s+(Blacksburg|Arlington)\]\s+/;

function applyCampusPrefix(text: string, campus: Campus): string {
  if (!campus) return text;
  if (CAMPUS_PREFIX.test(text)) return text;
  const label = campus === "blacksburg" ? "Blacksburg" : "Arlington";
  return `[Campus: ${label}] ${text}`;
}

export default function Home() {
  const [campus, setCampus] = useState<Campus>(null);
  const [topic, setTopic] = useState<Topic>("program");
  const [messages, setMessages] = useState<MessageData[]>([OPENING_MESSAGE]);
  const [pendingInput, setPendingInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSend(rawText: string) {
    const userMessage: MessageData = {
      role: "user",
      content: applyCampusPrefix(rawText, campus),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setPendingInput("");
    setIsLoading(true);

    try {
      const apiMessages = nextMessages.filter((m) => !m.clientOnly);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, topic }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? `API responded ${res.status}`,
        );
      }
      if (!res.body) throw new Error("No response body.");

      // Read the stream — append deltas live, finalise with sources on done.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let streamedText = "";
      let sources: string[] = [];
      let buffer = "";

      // Insert placeholder for live streaming
      setMessages([...nextMessages, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Keep last (potentially incomplete) line in buffer
        buffer = lines.pop() ?? "";

        for (const line of lines.filter(Boolean)) {
          try {
            const parsed = JSON.parse(line) as {
              type: string;
              text?: string;
              sources?: string[];
              error?: string;
            };
            if (parsed.type === "delta" && parsed.text) {
              streamedText += parsed.text;
              setMessages([
                ...nextMessages,
                { role: "assistant", content: streamedText },
              ]);
            } else if (parsed.type === "done") {
              streamedText = parsed.text ?? streamedText;
              sources = parsed.sources ?? [];
              setMessages([
                ...nextMessages,
                { role: "assistant", content: streamedText, sources },
              ]);
            } else if (parsed.type === "error") {
              throw new Error(parsed.error ?? "Stream error");
            }
          } catch {
            // Incomplete JSON — will complete in next chunk
          }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content:
            "Something went wrong reaching the advising assistant. Please try again in a moment — or email bieri@vt.edu if the problem persists.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleQuickQuestion(text: string) {
    setPendingInput(text);
  }

  return (
    <div className="flex flex-1 flex-col md:flex-row h-screen w-full overflow-hidden">
      <Sidebar
        campus={campus}
        setCampus={setCampus}
        topic={topic}
        setTopic={setTopic}
        onQuickQuestion={handleQuickQuestion}
      />
      <ChatWindow
        messages={messages}
        isLoading={isLoading}
        campus={campus}
        topic={topic}
        pendingInput={pendingInput}
        setPendingInput={setPendingInput}
        onSend={handleSend}
      />
    </div>
  );
}

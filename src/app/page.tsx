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

      const data = (await res.json()) as {
        text?: string;
        sources?: string[];
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? `API responded ${res.status}`);
      }
      if (!data.text) {
        throw new Error("Empty response from the model.");
      }

      setMessages([
        ...nextMessages,
        { role: "assistant", content: data.text, sources: data.sources ?? [] },
      ]);
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
    <div className="flex flex-1 flex-col md:flex-row h-dvh w-full overflow-hidden">
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

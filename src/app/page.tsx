"use client";

import { useEffect, useState } from "react";
import Sidebar, { Campus, Topic } from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import type { MessageData } from "@/components/Message";
import { OPENING_MESSAGE } from "@/lib/opening-message";
import { useStreamingChat } from "@/lib/useStreamingChat";

export default function Home() {
  const [campus, setCampus]         = useState<Campus>(null);
  const [topic, setTopic]           = useState<Topic>("program");
  const [pendingInput, setPendingInput] = useState("");

  // messages and isLoading are now managed by the streaming hook.
  // Campus prefixing is handled inside sendMessage — applyCampusPrefix removed.
  const { messages, setMessages, sendMessage, isLoading } = useStreamingChat({
    topic,
    campus,
  });

  // Seed the opening message on first render.
  // Replaces the initialiser that was previously in useState([OPENING_MESSAGE]).
  useEffect(() => {
    setMessages([OPENING_MESSAGE] as MessageData[]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSend(rawText: string) {
    setPendingInput("");
    await sendMessage(rawText);
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
        messages={messages as MessageData[]}
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

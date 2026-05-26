// src/components/StreamingCursor.tsx
// Blinking cursor shown at the end of a streaming message

export function StreamingCursor() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: "2px",
        height: "1em",
        backgroundColor: "currentColor",
        marginLeft: "2px",
        verticalAlign: "text-bottom",
        animation: "jane-blink 0.7s step-end infinite",
      }}
    />
  );
}

// Add this to your global CSS (e.g. globals.css):
//
// @keyframes jane-blink {
//   0%, 100% { opacity: 1; }
//   50%       { opacity: 0; }
// }


// ─── ChatWindow.tsx integration guide ────────────────────────────────────────
//
// 1. REPLACE the existing useState([]) + fetch() logic with the hook:
//
//    import { useStreamingChat } from "@/lib/useStreamingChat";
//
//    const { messages, setMessages, sendMessage, isLoading } = useStreamingChat({
//      topic,
//      campus,
//    });
//
// 2. REMOVE the old handleSend() function that does fetch("/api/chat", ...).
//    Replace its call site with:
//
//    await sendMessage(inputText);
//    setInputText("");
//
// 3. IN your Message component (Message.tsx), show the cursor when streaming:
//
//    import { StreamingCursor } from "./StreamingCursor";
//
//    // Inside the JSX, after ReactMarkdown:
//    {isLastMessage && isLoading && <StreamingCursor />}
//
//    Pass `isLastMessage` and `isLoading` as props from ChatWindow.
//
// 4. DISABLE the send button while streaming (already handled by isLoading).
//
// 5. The opening-message (clientOnly: true) in opening-message.ts still works
//    because setMessages() is exposed — seed it exactly as before:
//
//    useEffect(() => {
//      setMessages([{ role: "assistant", content: OPENING_MESSAGE }]);
//    }, []);
//
// 6. Escalation logic in ChatWindow.tsx is unchanged — it reads messages[]
//    and the last message index, same as before.
//
// ─────────────────────────────────────────────────────────────────────────────

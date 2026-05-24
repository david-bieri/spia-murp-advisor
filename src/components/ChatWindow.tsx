"use client";

import {
  FormEvent,
  Fragment,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import Message, { MessageData } from "./Message";
import { StarterPrompts } from "./StarterPrompts";
import type { Campus, Topic } from "./Sidebar";

interface ChatWindowProps {
  messages: MessageData[];
  isLoading: boolean;
  campus: Campus;
  topic: Topic;
  pendingInput: string;
  setPendingInput: (s: string) => void;
  onSend: (text: string) => void;
}

const ESCALATION_TEXT =
  "Jane has suggested you reach out directly — Todd Schenk (tschenk@vt.edu) for academic advising, or Prof. Bieri (bieri@vt.edu) for anything else.";

const ESCALATION_MESSAGE: MessageData = {
  role: "assistant",
  content: ESCALATION_TEXT,
};

function scopeLabel(topic: Topic, campus: Campus): string {
  if (topic === "program") return "MURP Program";
  if (topic === "admin") return "Contacts & Admin";
  if (topic === "electives") return "Electives";
  if (topic === "certificates") return "Certificates";
  // core — campus-aware
  if (campus === "blacksburg") return "Core · Blacksburg";
  if (campus === "arlington") return "Core · Arlington";
  return "Core Courses";
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div
        className="mt-1 flex h-8 w-8 flex-none items-center justify-center rounded-full text-white font-semibold text-xs"
        style={{ backgroundColor: "#861F41" }}
        aria-hidden
      >
        VT
      </div>
      <div
        className="rounded-2xl rounded-tl-sm bg-zinc-100 px-4 py-3 shadow-sm"
        role="status"
        aria-label="Assistant is typing"
      >
        <span className="inline-flex gap-1">
          <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.3s]" />
          <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.15s]" />
          <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce" />
        </span>
      </div>
    </div>
  );
}

export default function ChatWindow({
  messages,
  isLoading,
  campus,
  topic,
  pendingInput,
  setPendingInput,
  onSend,
}: ChatWindowProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [escalationAnchorIndex, setEscalationAnchorIndex] = useState<
    number | null
  >(null);
  const showCampusNudge = topic === "core" && campus === null;

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isLoading, escalationAnchorIndex]);

  function handleFeedback(index: number) {
    setEscalationAnchorIndex((prev) => (prev === null ? index : prev));
  }

  function submit() {
    const text = pendingInput.trim();
    if (!text || isLoading) return;
    onSend(text);
  }

  function handleFormSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submit();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <section className="flex flex-1 flex-col bg-white min-w-0">
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Asking about
          </p>
          <p className="font-serif text-lg text-zinc-900 leading-tight">
            {scopeLabel(topic, campus)}
          </p>
        </div>
        <span
          className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white"
          style={{ backgroundColor: "#861F41" }}
        >
          MURP · UEPP
        </span>
      </header>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-zinc-50"
      >
        {messages.length === 0 && !isLoading && (
          <div className="max-w-xl mx-auto text-center text-zinc-600 py-10">
            <p className="font-serif text-2xl text-zinc-900 mb-2">
              Hi — I&apos;m Jane.
            </p>
            <p className="text-sm leading-relaxed">
              I know the MURP program well: the two-year course sequence,
              certificate requirements, faculty research areas for thesis
              matching, and who to contact when the answer needs a human.
            </p>
            <div className="mt-6">
              <StarterPrompts onSelect={(prompt) => onSend(prompt)} />
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <Fragment key={i}>
            <Message
              message={m}
              onFeedback={
                m.role === "assistant" ? () => handleFeedback(i) : undefined
              }
            />
            {escalationAnchorIndex === i && (
              <Message message={ESCALATION_MESSAGE} />
            )}
          </Fragment>
        ))}
        {isLoading && <TypingIndicator />}
      </div>

      {showCampusNudge && (
        <div
          className="px-6 py-2 text-xs border-t border-zinc-200"
          style={{ backgroundColor: "#FEF3E7", color: "#7A3E0A" }}
        >
          Tip: select a campus in the sidebar for course-specific answers
          about UAP 5174 and other core courses.
        </div>
      )}

      <form
        onSubmit={handleFormSubmit}
        className="border-t border-zinc-200 px-6 py-4 bg-white"
      >
        <div className="flex items-end gap-3">
          <textarea
            value={pendingInput}
            onChange={(e) => setPendingInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Jane about the MURP program or who to contact … (don't mention Robert Moses)"
            rows={2}
            className="flex-1 resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#861F41]/40 focus:border-[#861F41]"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || pendingInput.trim().length === 0}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#E5751F" }}
          >
            Send
          </button>
        </div>
      </form>
    </section>
  );
}

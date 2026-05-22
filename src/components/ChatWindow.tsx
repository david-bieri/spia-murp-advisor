"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef } from "react";
import Message, { MessageData } from "./Message";
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

function scopeLabel(topic: Topic, campus: Campus): string {
  if (topic === "program") return "MURP curriculum";
  if (topic === "admin") return "SPIA admin & contacts";
  if (campus === "blacksburg") return "UAP 5174 — Blacksburg";
  if (campus === "arlington") return "UAP 5174 — Arlington";
  return "UAP 5174 — select campus";
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
  const showCampusNudge = topic === "uap5174" && campus === null;

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);

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
            Scope
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
              Ask about the MURP program.
            </p>
            <p className="text-sm leading-relaxed">
              I can answer questions about the MURP curriculum, UAP 5174
              policies (Blacksburg or Arlington), and which SPIA staff member
              to contact for what. I&apos;m informational only — for official
              decisions, confirm with your advisor.
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <Message key={i} message={m} />
        ))}
        {isLoading && <TypingIndicator />}
      </div>

      {showCampusNudge && (
        <div
          className="px-6 py-2 text-xs border-t border-zinc-200"
          style={{ backgroundColor: "#FEF3E7", color: "#7A3E0A" }}
        >
          Tip: select a campus in the sidebar for course-specific UAP 5174
          answers.
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
            placeholder="Ask about MURP, UAP 5174, or who to contact…"
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
"use client";

import {
  FormEvent,
  Fragment,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import Message from "./Message";                          // named export (was default)
import type { MessageData } from "./Message";                 // type-only import
import { StarterPrompts } from "./StarterPrompts";
import { BUILDING_PLAN_SENTINEL } from "@/lib/useStreamingChat"; // sentinel string
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
  if (topic === "program")      return "MURP Program";
  if (topic === "admin")        return "Contacts & Admin";
  if (topic === "electives")    return "Electives";
  if (topic === "certificates") return "Certificates";
  if (campus === "blacksburg")  return "Core · Blacksburg";
  if (campus === "arlington")   return "Core · Arlington";
  return "Core Courses";
}

// Shown only while waiting for the very first streaming token —
// i.e. isLoading is true but the placeholder message hasn't appeared yet.
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

// "Building your plan..." shown while DEGREE_PLAN JSON streams in
function BuildingPlanIndicator() {
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
        className="rounded-2xl rounded-tl-sm bg-zinc-100 px-4 py-3 shadow-sm text-sm text-zinc-500"
        role="status"
        aria-label="Building degree plan"
      >
        Building your plan…
        <span className="inline-block w-0.5 h-3.5 ml-1 bg-zinc-400 align-text-bottom animate-[jane-blink_0.7s_step-end_infinite]" />
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
  const [longConvoDismissed, setLongConvoDismissed] = useState(false);

  const showCampusNudge    = topic === "core" && campus === null;
  const showElectivesNudge = topic === "electives" && campus === null;
  const showAdminNudge     = topic === "admin";
  const showLongConvoNudge = messages.length >= 9 && !longConvoDismissed;

  // True when streaming has started — last message is a partial assistant turn
  const lastMessage = messages[messages.length - 1];
  const isStreamingNow =
    isLoading &&
    lastMessage?.role === "assistant";

  // Show TypingIndicator only before the first token arrives
  const showTypingIndicator =
    isLoading && lastMessage?.role === "user";

  // Show BuildingPlanIndicator instead of TypingIndicator for structured output
  const showBuildingPlan =
    isStreamingNow && lastMessage?.content === BUILDING_PLAN_SENTINEL;

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isLoading, escalationAnchorIndex]);

  function handleThumbsDown(index: number) {
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
        {messages.length === 1 && !isLoading && (
          <StarterPrompts onSelect={(prompt) => onSend(prompt)} />
        )}

        {messages.map((m, i) => {
          // Skip the sentinel — BuildingPlanIndicator renders below instead
          if (m.content === BUILDING_PLAN_SENTINEL) return null;

          const isLast = i === messages.length - 1;

          return (
            <Fragment key={i}>
              <Message
                message={m}
                isStreaming={isLast && isStreamingNow}
                isLastMessage={isLast}
                campus={campus}
                onSendPrompt={(text) => onSend(text)}
                onThumbsDown={
                  m.role === "assistant"
                    ? () => handleThumbsDown(i)
                    : undefined
                }
              />
              {escalationAnchorIndex === i && (
                <Message
                  message={ESCALATION_MESSAGE}
                  campus={campus}
                  onSendPrompt={(text) => onSend(text)}
                />
              )}
            </Fragment>
          );
        })}

        {showBuildingPlan    && <BuildingPlanIndicator />}
        {showTypingIndicator && <TypingIndicator />}
      </div>

      {/* ── Nudges ── */}
      {showCampusNudge && (
        <div
          className="px-6 py-2 text-xs border-t border-zinc-200"
          style={{ backgroundColor: "#FEF3E7", color: "#7A3E0A" }}
        >
          Tip: select a campus in the sidebar for course-specific answers
          about core courses.
        </div>
      )}
      {showElectivesNudge && (
        <div
          className="px-6 py-2 text-xs border-t border-zinc-200"
          style={{ backgroundColor: "#FEF3E7", color: "#7A3E0A" }}
        >
          Tip: some electives are campus-specific — select a campus for
          accurate availability.
        </div>
      )}
      {showAdminNudge && (
        <div
          className="px-6 py-2 text-xs border-t border-zinc-200"
          style={{ backgroundColor: "#EFF6FF", color: "#1E40AF" }}
        >
          Jane routes to the right person — she doesn&apos;t have access to
          live systems like Banner or your student record.
        </div>
      )}
      {showLongConvoNudge && (
        <div
          className="flex items-center justify-between px-6 py-2 text-xs border-t border-zinc-200"
          style={{ backgroundColor: "#F0FDF4", color: "#166534" }}
        >
          <span>
            Starting a new topic? A fresh conversation gives Jane a clean slate.
          </span>
          <button
            type="button"
            onClick={() => setLongConvoDismissed(true)}
            className="ml-4 font-medium underline opacity-70 hover:opacity-100 transition-opacity"
          >
            Dismiss
          </button>
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

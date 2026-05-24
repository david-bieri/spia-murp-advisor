"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export type Role = "user" | "assistant";

export interface MessageData {
  role: Role;
  content: string;
  sources?: string[];   // KB files used to answer — attached by page.tsx
  clientOnly?: boolean; // If true, filtered out before sending to API
}

interface MessageProps {
  message: MessageData;
  onFeedback?: () => void;
}

const CAMPUS_PREFIX = /^\[Campus:\s+(Blacksburg|Arlington)\]\s+/;

function stripCampusPrefix(text: string): string {
  return text.replace(CAMPUS_PREFIX, "");
}

// Files always in context — not interesting to display
const HIDDEN_SOURCES = new Set([
  "jacobs_concepts.md",
  "planning_pearls.md",
  "spia_staff_contacts.md",
  "murp_faqs.md",
]);

function formatSource(filename: string): string {
  const base = filename.replace(/\.md$/, "");

  if (base.startsWith("thesis_")) {
    const parts = base.replace("thesis_", "").split("_");
    return "Thesis: " + parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
  }
  if (base.startsWith("murp_rubric_")) return "MURP Thesis Rubric";
  if (base === "murp_curriculum") return "MURP Curriculum";
  if (base === "murp_course_sequence") return "Course Sequence";
  if (base === "murp_certificates_detail") return "Certificates";
  if (base === "murp_electives") return "Electives Catalog";
  if (base === "murp_4plus1") return "4+1 Pathway";
  if (base === "murp_student_life") return "Student Life";
  if (base === "murp_faculty_research") return "Faculty Research";

  // Course syllabi: uap5174_blacksburg_bieri_s26
  const parts = base.split("_");
  const course = parts[0].toUpperCase().replace(/([A-Z]+)(\d+)/, "$1 $2");
  const meta = parts
    .slice(1)
    .filter((p) => p && p !== "ns" && p.length > 1)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" · ");
  return meta ? `${course} · ${meta}` : course;
}

function Sources({ sources }: { sources: string[] }) {
  const [expanded, setExpanded] = useState(false);

  const interesting = sources.filter((s) => !HIDDEN_SOURCES.has(s));
  if (interesting.length === 0) return null;

  const visible = expanded ? interesting : interesting.slice(0, 3);
  const remainder = interesting.length - 3;

  return (
    <div className="mt-1.5">
      <div className="flex flex-wrap gap-1 items-center">
        {visible.map((s) => (
          <span
            key={s}
            className="inline-block rounded px-1.5 py-0.5 text-[10px] leading-tight bg-zinc-200 text-zinc-500"
          >
            {formatSource(s)}
          </span>
        ))}
        {!expanded && remainder > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-[10px] text-zinc-400 hover:text-[#861F41] transition-colors"
          >
            +{remainder} more
          </button>
        )}
      </div>
    </div>
  );
}

function ThumbsUpIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}

function ThumbsDownIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 14V2" />
      <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

export default function Message({ message, onFeedback }: MessageProps) {
  const [thumbsUpSent, setThumbsUpSent] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[80%] rounded-2xl rounded-br-sm px-4 py-3 text-white whitespace-pre-wrap leading-relaxed shadow-sm"
          style={{ backgroundColor: "#E5751F" }}
        >
          {stripCampusPrefix(message.content)}
        </div>
      </div>
    );
  }

  const showActions = onFeedback !== undefined;

  function handleThumbsUp() {
    if (thumbsUpSent) return;
    console.log("feedback:thumbs-up", message);
    setThumbsUpSent(true);
  }

  function handleThumbsDown() {
    if (feedbackSent) return;
    console.log("feedback:thumbs-down", message);
    setFeedbackSent(true);
    onFeedback?.();
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (insecure context, denied permission) — silent fail.
    }
  }

  const confirmationText = copied
    ? "Copied!"
    : feedbackSent
    ? "Thanks — flagged for review"
    : thumbsUpSent
    ? "Thanks!"
    : null;

  return (
    <div className="flex items-start gap-3">
      <div
        className="mt-1 flex h-8 w-8 flex-none items-center justify-center rounded-full text-white font-semibold text-xs"
        style={{ backgroundColor: "#861F41" }}
        aria-hidden
      >
        VT
      </div>
      <div className="flex flex-col gap-1 max-w-[80%]">
        <div className="rounded-2xl rounded-tl-sm bg-zinc-100 px-4 py-3 text-zinc-900 leading-relaxed shadow-sm prose prose-sm prose-zinc max-w-none">
          <ReactMarkdown
          //remarkPlugins={[remarkGfm]}
            components={{
              h2: ({ children }) => (
                <h2 className="text-sm font-semibold text-zinc-900 mt-3 mb-1">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-sm font-semibold text-zinc-700 mt-2 mb-1">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="mb-2 last:mb-0">{children}</p>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-zinc-900">
                  {children}
                </strong>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside mb-2 space-y-0.5">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside mb-2 space-y-0.5">
                  {children}
                </ol>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-2">
                  <table className="text-xs border-collapse w-full">
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-zinc-300 px-2 py-1 bg-zinc-200 font-semibold text-left">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-zinc-300 px-2 py-1">{children}</td>
              ),
              hr: () => <hr className="border-zinc-200 my-2" />,
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-[#861F41] underline hover:opacity-75"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        {message.sources && message.sources.length > 0 && (
          <Sources sources={message.sources} />
        )}
        {showActions && (
          <div className="self-start flex items-center gap-1">
            <button
              type="button"
              onClick={handleThumbsUp}
              disabled={thumbsUpSent}
              className="text-zinc-400 hover:text-[#861F41] disabled:text-zinc-300 transition-colors p-1 rounded"
              aria-label="Mark this answer as helpful"
              title="Helpful"
            >
              <ThumbsUpIcon />
            </button>
            <button
              type="button"
              onClick={handleThumbsDown}
              disabled={feedbackSent}
              className="text-zinc-400 hover:text-[#861F41] disabled:text-zinc-300 transition-colors p-1 rounded"
              aria-label="Report this answer as unhelpful"
              title="Not helpful"
            >
              <ThumbsDownIcon />
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="text-zinc-400 hover:text-[#861F41] transition-colors p-1 rounded"
              aria-label="Copy message to clipboard"
              title="Copy"
            >
              <CopyIcon />
            </button>
            {confirmationText && (
              <span className="ml-1 text-[11px] text-zinc-400">
                {confirmationText}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
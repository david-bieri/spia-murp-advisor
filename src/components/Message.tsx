"use client";

import { useState } from "react";

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

export default function Message({ message, onFeedback }: MessageProps) {
  const [feedbackSent, setFeedbackSent] = useState(false);

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
        <div className="rounded-2xl rounded-tl-sm bg-zinc-100 px-4 py-3 text-zinc-900 whitespace-pre-wrap leading-relaxed shadow-sm">
          {message.content}
        </div>
        {message.sources && message.sources.length > 0 && (
          <Sources sources={message.sources} />
        )}
        <button
          type="button"
          onClick={() => {
            console.log("feedback:thumbs-down", message);
            setFeedbackSent(true);
            onFeedback?.();
          }}
          disabled={feedbackSent}
          className="self-start text-xs text-zinc-400 hover:text-[#861F41] disabled:text-zinc-300 transition-colors"
          aria-label="Report this answer as unhelpful"
        >
          {feedbackSent ? "Thanks — flagged for review" : "Not helpful"}
        </button>
      </div>
    </div>
  );
}

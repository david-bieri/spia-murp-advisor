"use client";

import { useState } from "react";

export type Role = "user" | "assistant";

export interface MessageData {
  role: Role;
  content: string;
}

interface MessageProps {
  message: MessageData;
}

const CAMPUS_PREFIX = /^\[Campus:\s+(Blacksburg|Arlington)\]\s+/;

function stripCampusPrefix(text: string): string {
  return text.replace(CAMPUS_PREFIX, "");
}

export default function Message({ message }: MessageProps) {
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
        <button
          type="button"
          onClick={() => {
            console.log("feedback:thumbs-down", message);
            setFeedbackSent(true);
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
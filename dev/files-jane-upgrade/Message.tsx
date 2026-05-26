// src/components/Message.tsx
// Phase 3 revision: adds JSON detection for structured card rendering
//
// ADR-019 COMPLIANCE — do not change feedback UX:
// - Icons: 👍 (thumbs-up SVG) · 👎 (thumbs-down SVG) · 📋 (copy SVG)
// - Thumbs-down fires internal escalation (clientOnly message) — handled in ChatWindow
// - ChatWindowProps does NOT include onFeedback — do not add it
// - Copy button: 2-second confirmation state
// - Escalation message: "Jane has suggested you reach out directly..."
//
// Phase 3 addition: tryParseStructured() before ReactMarkdown.
// If response is valid DEGREE_PLAN or DEGREE_AUDIT JSON, render the card component.

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { StreamingCursor } from "./StreamingCursor";
import { DegreePlanCard, isDegreePlan } from "./DegreePlanCard";
import { DegreeAuditCard, isDegreeAudit } from "./DegreeAuditCard";
import { isThesisSuggestions, isFundingMatches, ThesisTopicCard, FundingCard } from "./StructuredCards";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MessageData {
  role: "user" | "assistant";
  content: string;
  clientOnly?: boolean; // escalation messages — filtered before POST (ADR-019)
}

interface MessageProps {
  message: MessageData;
  isStreaming?: boolean;
  isLastMessage?: boolean;
  campus: string | null;
  onSendPrompt: (text: string) => void;
  // NOTE: no onFeedback prop — thumbs-down escalation is internal to ChatWindow (ADR-019)
  onThumbsDown?: () => void; // ChatWindow uses this to inject the clientOnly escalation message
}

// ── JSON detection ────────────────────────────────────────────────────────────

function tryParseStructured(content: string): unknown | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith("{")) return null;
  try { return JSON.parse(trimmed); } catch { return null; }
}

function stripCampusPrefix(content: string): string {
  return content.replace(/^\[Campus:[^\]]+\]\s*/, "");
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Message({
  message,
  isStreaming = false,
  isLastMessage = false,
  campus,
  onSendPrompt,
  onThumbsDown,
}: MessageProps) {
  const [copied, setCopied] = useState(false);

  const { role, content } = message;

  // User bubble
  if (role === "user") {
    return (
      <div className="message user-message">
        <div className="user-bubble">{stripCampusPrefix(content)}</div>
      </div>
    );
  }

  // Assistant bubble
  // Structured parsing only on complete (non-streaming) responses
  const parsed = isStreaming ? null : tryParseStructured(content);

  const renderContent = () => {
    if (parsed) {
      if (isDegreePlan(parsed))        return <DegreePlanCard plan={parsed} onSendPrompt={onSendPrompt} />;
      if (isDegreeAudit(parsed))       return <DegreeAuditCard audit={parsed} onSendPrompt={onSendPrompt} />;
      if (isThesisSuggestions(parsed)) return <ThesisTopicCard suggestions={parsed} onSendPrompt={onSendPrompt} />;
      if (isFundingMatches(parsed))    return <FundingCard matches={parsed} onSendPrompt={onSendPrompt} />;
    }

    return (
      <>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        {isLastMessage && isStreaming && <StreamingCursor />}
      </>
    );
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="message assistant-message">
      {/* VT avatar — maroon circle with J */}
      <div className="vt-avatar" aria-hidden="true">J</div>
      <div className="assistant-content">
        <div className="assistant-bubble">{renderContent()}</div>

        {/* ADR-019: 3-icon feedback bar — only on complete messages */}
        {!isStreaming && (
          <div className="feedback-bar" role="group" aria-label="Message feedback">
            {/* Thumbs up — SVG, inline, grey → maroon on hover */}
            <button
              className="feedback-btn"
              aria-label="Helpful"
              title="Helpful"
              onClick={() => {
                // Phase 2 completion: wire to POST /api/feedback when backend exists
                console.log("feedback: up");
              }}
            >
              {/* Inline SVG thumbs-up — keep existing SVG from project */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
                <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
            </button>

            {/* Thumbs down — SVG; triggers clientOnly escalation via ChatWindow */}
            <button
              className="feedback-btn"
              aria-label="Not helpful"
              title="Not helpful"
              onClick={onThumbsDown}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
                <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
              </svg>
            </button>

            {/* Copy — SVG; 2-second confirmation */}
            <button
              className="feedback-btn"
              aria-label={copied ? "Copied!" : "Copy message"}
              title={copied ? "Copied!" : "Copy"}
              onClick={handleCopy}
            >
              {copied ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

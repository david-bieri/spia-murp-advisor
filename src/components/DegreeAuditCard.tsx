// src/components/DegreeAuditCard.tsx
// Renders the structured JSON degree audit output from Jane.
// Used in Message.tsx when response parses as type: "DEGREE_AUDIT"

import React from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuditCourse {
  code: string;
  name: string;
  credits: number;
  category: "core" | "elective" | "certificate" | "thesis" | "capstone";
}

interface DegreeAudit {
  type: "DEGREE_AUDIT";
  completed: AuditCourse[];
  remaining: {
    core: AuditCourse[];
    electives_needed_credits: number;
    thesis_or_capstone: "not started" | "in progress" | "complete";
    certificate: {
      name: string | null;
      courses_remaining: AuditCourse[];
    };
  };
  credit_totals: {
    completed: number;
    remaining: number;
    total_required: number;
  };
  on_track: boolean;
  notes: string[];
}

interface Props {
  audit: DegreeAudit;
  onSendPrompt: (text: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DegreeAuditCard({ audit, onSendPrompt }: Props) {
  const pct = Math.round(
    (audit.credit_totals.completed / audit.credit_totals.total_required) * 100
  );

  return (
    <div className="degree-audit-card">
      {/* Progress header */}
      <div className="audit-header">
        <div className="audit-progress-bar">
          <div className="audit-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="audit-progress-label">
          {audit.credit_totals.completed} of {audit.credit_totals.total_required} credits completed ({pct}%)
        </div>
        <div className={`audit-status ${audit.on_track ? "on-track" : "needs-attention"}`}>
          {audit.on_track ? "On track" : "Needs attention"}
        </div>
      </div>

      <div className="audit-columns">
        {/* Completed */}
        <div className="audit-col">
          <div className="audit-col-header completed">Completed</div>
          {audit.completed.map((c) => (
            <div key={c.code} className={`audit-course completed ${c.category}`}>
              <span className="audit-code">{c.code}</span>
              <span className="audit-name">{c.name}</span>
              <span className="audit-credits">{c.credits} cr</span>
            </div>
          ))}
          <div className="audit-col-total">{audit.credit_totals.completed} credits</div>
        </div>

        {/* Remaining */}
        <div className="audit-col">
          <div className="audit-col-header remaining">Still needed</div>

          {audit.remaining.core.length > 0 && (
            <div className="audit-section-label">Core requirements</div>
          )}
          {audit.remaining.core.map((c) => (
            <div key={c.code} className="audit-course remaining core">
              <span className="audit-code">{c.code}</span>
              <span className="audit-name">{c.name}</span>
              <span className="audit-credits">{c.credits} cr</span>
            </div>
          ))}

          {audit.remaining.electives_needed_credits > 0 && (
            <div className="audit-course remaining elective">
              <span className="audit-name">
                Elective credits needed
              </span>
              <span className="audit-credits">
                {audit.remaining.electives_needed_credits} cr
              </span>
            </div>
          )}

          {audit.remaining.certificate.name && audit.remaining.certificate.courses_remaining.length > 0 && (
            <>
              <div className="audit-section-label">
                {audit.remaining.certificate.name} certificate
              </div>
              {audit.remaining.certificate.courses_remaining.map((c) => (
                <div key={c.code} className="audit-course remaining certificate">
                  <span className="audit-code">{c.code}</span>
                  <span className="audit-name">{c.name}</span>
                  <span className="audit-credits">{c.credits} cr</span>
                </div>
              ))}
            </>
          )}

          <div className="audit-course remaining thesis-status">
            <span className="audit-name">
              {audit.remaining.thesis_or_capstone === "complete"
                ? "Thesis/capstone complete"
                : audit.remaining.thesis_or_capstone === "in progress"
                ? "Thesis/capstone in progress"
                : "Thesis or capstone not started"}
            </span>
          </div>

          <div className="audit-col-total">{audit.credit_totals.remaining} credits remaining</div>
        </div>
      </div>

      {/* Notes */}
      {audit.notes.length > 0 && (
        <div className="audit-notes">
          {audit.notes.map((n, i) => (
            <div key={i} className="audit-note">ℹ {n}</div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="plan-actions">
        <button onClick={() => onSendPrompt("What electives would you recommend to complete my remaining credits?")}>
          Recommend electives ↗
        </button>
        <button onClick={() => onSendPrompt("Can you build a degree plan for my remaining semesters?")}>
          Plan remaining semesters ↗
        </button>
      </div>
    </div>
  );
}

// ── Type guard ────────────────────────────────────────────────────────────────

export function isDegreeAudit(obj: unknown): obj is DegreeAudit {
  return (
    typeof obj === "object" &&
    obj !== null &&
    (obj as DegreeAudit).type === "DEGREE_AUDIT" &&
    Array.isArray((obj as DegreeAudit).completed)
  );
}

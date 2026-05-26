// src/components/ThesisTopicCard.tsx
// Renders 2–3 thesis direction suggestions from Jane.
// Jane returns prose for thesis brainstorming — this card is optional enhancement.
// Use when Jane's response contains a structured thesis directions array.
// For Phase 2, Jane returns plain prose for thesis brainstorming — this is Phase 2.5.

import React from "react";

interface ThesisDirection {
  title: string;          // Short title for the direction
  question: string;       // The core research question
  method: string;         // Feasible method in 1 sentence
  data: string;           // What data they would need
  faculty_area: string;   // Which faculty area is most relevant (no names)
}

interface ThesisSuggestions {
  type: "THESIS_SUGGESTIONS";
  student_interests: string;
  directions: ThesisDirection[];
}

interface Props {
  suggestions: ThesisSuggestions;
  onSendPrompt: (text: string) => void;
}

export function ThesisTopicCard({ suggestions, onSendPrompt }: Props) {
  return (
    <div className="thesis-card">
      <div className="thesis-preamble">
        Based on your interests in <em>{suggestions.student_interests}</em>, here are three viable thesis directions:
      </div>

      {suggestions.directions.map((dir, i) => (
        <div key={i} className="thesis-direction">
          <div className="thesis-direction-num">{i + 1}</div>
          <div className="thesis-direction-body">
            <div className="thesis-direction-title">{dir.title}</div>
            <div className="thesis-row">
              <span className="thesis-row-label">Research question</span>
              <span className="thesis-row-value">{dir.question}</span>
            </div>
            <div className="thesis-row">
              <span className="thesis-row-label">Method</span>
              <span className="thesis-row-value">{dir.method}</span>
            </div>
            <div className="thesis-row">
              <span className="thesis-row-label">Data needed</span>
              <span className="thesis-row-value">{dir.data}</span>
            </div>
            <div className="thesis-row">
              <span className="thesis-row-label">Faculty area</span>
              <span className="thesis-row-value">{dir.faculty_area}</span>
            </div>
            <button
              className="thesis-explore-btn"
              onClick={() => onSendPrompt(`Tell me more about direction ${i + 1}: ${dir.title}`)}
            >
              Explore this direction ↗
            </button>
          </div>
        </div>
      ))}

      <div className="plan-actions" style={{ marginTop: "1rem" }}>
        <button onClick={() => onSendPrompt("Who at MURP could advise on these directions?")}>
          Find an advisor ↗
        </button>
        <button onClick={() => onSendPrompt("Can you suggest a different set of directions?")}>
          Different directions ↗
        </button>
      </div>
    </div>
  );
}

export function isThesisSuggestions(obj: unknown): obj is ThesisSuggestions {
  return (
    typeof obj === "object" &&
    obj !== null &&
    (obj as ThesisSuggestions).type === "THESIS_SUGGESTIONS" &&
    Array.isArray((obj as ThesisSuggestions).directions)
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// FundingCard
// src/components/FundingCard.tsx
// Renders matched funding opportunities from Jane.
// ─────────────────────────────────────────────────────────────────────────────

interface FundingOpportunity {
  name: string;
  amount: string;
  deadline: string;
  eligibility: string;
  focus_match: string;    // Why this matches the student
  url: string | null;
  contact: string | null;
}

interface FundingMatches {
  type: "FUNDING_MATCHES";
  student_profile: string;  // brief description of student Jane matched against
  opportunities: FundingOpportunity[];
  note: string;
}

interface FundingProps {
  matches: FundingMatches;
  onSendPrompt: (text: string) => void;
}

export function FundingCard({ matches, onSendPrompt }: FundingProps) {
  return (
    <div className="funding-card">
      <div className="funding-preamble">
        Funding opportunities matched to your profile: <em>{matches.student_profile}</em>
      </div>

      {matches.opportunities.map((opp, i) => (
        <div key={i} className="funding-opportunity">
          <div className="funding-opp-header">
            <span className="funding-opp-name">{opp.name}</span>
            <span className="funding-amount">{opp.amount}</span>
          </div>
          <div className="funding-deadline">Deadline: {opp.deadline}</div>
          <div className="funding-match-reason">{opp.focus_match}</div>
          <div className="funding-eligibility">{opp.eligibility}</div>
          <div className="funding-links">
            {opp.url && (
              <a href={opp.url} target="_blank" rel="noopener noreferrer">
                Apply ↗
              </a>
            )}
            {opp.contact && (
              <span className="funding-contact">Contact: {opp.contact}</span>
            )}
          </div>
        </div>
      ))}

      {matches.note && (
        <div className="funding-note">{matches.note}</div>
      )}

      <div className="plan-actions" style={{ marginTop: "1rem" }}>
        <button onClick={() => onSendPrompt("Tell me more about applying for a GTA")}>
          GTA details ↗
        </button>
        <button onClick={() => onSendPrompt("What are the deadlines for all these opportunities?")}>
          All deadlines ↗
        </button>
      </div>
    </div>
  );
}

export function isFundingMatches(obj: unknown): obj is FundingMatches {
  return (
    typeof obj === "object" &&
    obj !== null &&
    (obj as FundingMatches).type === "FUNDING_MATCHES" &&
    Array.isArray((obj as FundingMatches).opportunities)
  );
}

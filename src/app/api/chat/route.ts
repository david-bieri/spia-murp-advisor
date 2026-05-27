// src/app/api/chat/route.ts — develop branch
// Replaces non-streaming version (AbortController + messages.create)
// with SSE streaming (TransformStream + messages.stream)
//
// Preserved from current:
//   - isChatMessage type guard and body validation
//   - getContext(lastUserQuery, topic) call
//   - claude-sonnet-4-6 model string
//   - messages.slice(-10) limit
//   - Anthropic error handling
//
// Added:
//   - campus parameter in request body
//   - clientOnly message filtering (prevents escalation messages reaching API)
//   - detectModeAddendum() for DEGREE_PLAN and DEGREE_AUDIT structured output
//   - Streaming via TransformStream + X-Accel-Buffering: no

import Anthropic from "@anthropic-ai/sdk";
import { getContext } from "@/lib/knowledge";
import { buildSystemPrompt } from "@/lib/systemPrompt"; // camelCase — matches existing file

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  clientOnly?: boolean;
};

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 30;

// ── Type guard (preserved from current) ──────────────────────────────────────

function isChatMessage(m: unknown): m is ChatMessage {
  if (typeof m !== "object" || m === null) return false;
  const obj = m as Record<string, unknown>;
  return (
    (obj.role === "user" || obj.role === "assistant") &&
    typeof obj.content === "string"
  );
}

// ── Mode detection ────────────────────────────────────────────────────────────

const PLAN_TRIGGER_RE =
  /\b(build|create|generate|make)\s+(me\s+)?(my\s+)?(a\s+)?(degree|two.year|semester|course)\s+plan\b/i;

const AUDIT_TRIGGER_RE =
  /\b(audit|i('ve| have)\s+(taken|completed)|what('s| is)\s+left|remaining\s+(credits|requirements)|how far along)\b/i;

const PLAN_ADDENDUM = `
## Degree plan generation mode

You are building a personalised two-year MURP degree plan.

If you are missing any of the five profile dimensions below, ask for the next
missing one naturally — one question at a time:
1. Campus (Blacksburg or Arlington/NCR)
2. Primary focus area (transportation, housing, environmental, international, data)
3. Certificate interest (which certificate, or none)
4. Track (thesis or applied project/capstone)
5. Any constraints (part-time, summers available, specific faculty, prior courses)

Once you have all five, respond with ONLY valid JSON — no preamble, no markdown fences:

{
  "type": "DEGREE_PLAN",
  "profile": {
    "campus": "blacksburg" | "arlington",
    "focus": string,
    "certificate": string | null,
    "track": "thesis" | "capstone"
  },
  "semesters": [
    {
      "label": "Fall — year 1",
      "courses": [
        {
          "code": "UAP 5014",
          "name": "Gateway to planning",
          "credits": 3,
          "category": "chip-core" | "chip-elective" | "chip-cert" | "chip-thesis",
          "rationale": "One sentence — why this course is here."
        }
      ]
    }
  ],
  "planning_pearl": "One sharp practical sentence. Jane's voice.",
  "credit_totals": { "total": 48, "core": 18, "elective": 24, "certificate": 0, "thesis": 6 },
  "warnings": []
}

HARD CONSTRAINTS — validate before outputting:
- Total credits must equal 48
- Core credits must equal 18 (UAP 5014, UAP 5234, UAP 5084, UAP 5174, UAP 5224, UAP 5554)
- Thesis or capstone credits must be >= 6
- Maximum 4 courses per semester — never exceed this
- Maximum 15 credits per semester — add to warnings if approaching
- Year 1 Fall: UAP 5014, UAP 5234, UAP 5084 (plus one elective)
- UAP 5174 is Spring only — never place in Fall
- UAP 5224 must be Year 1 Spring
- category values must be exactly: chip-core, chip-elective, chip-cert, or chip-thesis
- Use murp_course_sequence.md and murp_curriculum.md as authoritative sources
`;

const AUDIT_ADDENDUM = `
## Degree audit mode

The student will list completed courses. Extract course codes, match against
murp_curriculum.md and murp_course_sequence.md, respond with ONLY valid JSON:

{
  "type": "DEGREE_AUDIT",
  "completed": [
    { "code": "UAP 5014", "name": "Gateway to planning", "credits": 3, "category": "chip-core" }
  ],
  "remaining": {
    "core": [],
    "electives_needed_credits": 0,
    "thesis_or_capstone": "not started" | "in progress" | "complete",
    "certificate": { "name": null, "courses_remaining": [] }
  },
  "credit_totals": { "completed": 0, "remaining": 48, "total_required": 48 },
  "on_track": true,
  "notes": []
}

category values must be exactly: chip-core, chip-elective, chip-cert, or chip-thesis.
`;

function detectModeAddendum(
  query: string,
  history: ChatMessage[]
): string | null {
  if (AUDIT_TRIGGER_RE.test(query)) return AUDIT_ADDENDUM;
  if (PLAN_TRIGGER_RE.test(query))  return PLAN_ADDENDUM;

  const recent = history.slice(-10).map((m) => m.content).join(" ");
  const elicitationComplete =
    /\b(blacksburg|arlington|ncr)\b/i.test(recent) &&
    /\b(thesis|capstone|applied project)\b/i.test(recent) &&
    /\b(transportation|housing|environmental|international|data)\b/i.test(recent) &&
    PLAN_TRIGGER_RE.test(recent);

  return elicitationComplete ? PLAN_ADDENDUM : null;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !Array.isArray((body as { messages?: unknown }).messages) ||
    !(body as { messages: unknown[] }).messages.every(isChatMessage)
  ) {
    return Response.json(
      {
        error:
          "Body must be { messages: [{ role: 'user' | 'assistant', content: string }, ...] }",
      },
      { status: 400 },
    );
  }

  const typedBody = body as {
    messages: ChatMessage[];
    topic?: string;
    campus?: string;
  };

  // Filter clientOnly before sending to API — escalation messages must not go upstream
  const messages = typedBody.messages
    .filter((m) => !m.clientOnly)
    .slice(-10);

  const topic =
    typeof typedBody.topic === "string" ? typedBody.topic : undefined;
  const campus =
    typeof typedBody.campus === "string" ? typedBody.campus : undefined;

  const lastUserQuery =
    [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  const { text: contextText, sources } = await getContext(lastUserQuery, topic);

  const modeAddendum = detectModeAddendum(lastUserQuery, messages);
  const campusNote   = campus
    ? `\n\nThe student is on the ${
        campus === "blacksburg" ? "Blacksburg" : "Arlington/NCR"
      } campus. Always respect campus availability in murp_prerequisites.md.`
    : "";

  const system =
    buildSystemPrompt(contextText) + campusNote + (modeAddendum ?? "");

  // ── Streaming ────────────────────────────────────────────────────────────
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  (async () => {
    try {
      const stream = client.messages.stream({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system,
        messages: messages.map(({ role, content }) => ({ role, content })),
      });

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          await writer.write(
            encoder.encode(
              `data: ${JSON.stringify({ text: event.delta.text })}\n\n`
            )
          );
        }
      }

      await writer.write(
        encoder.encode(
          `data: ${JSON.stringify({ sources })}\n\n`
        )
      );
      await writer.write(encoder.encode("data: [DONE]\n\n"));
    } catch (err) {
      const message =
        err instanceof Anthropic.APIError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Unknown error";
      await writer.write(
        encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
      );
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type":      "text/event-stream",
      "Cache-Control":     "no-cache",
      "Connection":        "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

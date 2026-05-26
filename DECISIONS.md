# Jane — Architecture Decision Records

---

## ADR-001 — `getContext()` as phase boundary interface
**Status:** Accepted  
**Decision:** `getContext(query, topic?) → { text: string, sources: string[] }` is the
only function the chat layer calls for knowledge retrieval. The return type is locked
across all phases. Only the implementation behind it may change.  
**Rationale:** Decouples knowledge retrieval from chat logic. Enables Phase 4 RAG
migration without touching route.ts.

## ADR-002 — Strangler Fig phasing
**Status:** Accepted  
**Decision:** Each phase replaces internals without restructuring the public interface.
Prototype is the skeleton, not a throwaway.  
**Rationale:** Avoids big-bang rewrites. Each phase ships value independently.

## ADR-003 — Vercel deployment, auto-deploy on push to main
**Status:** Accepted  
**Decision:** GitHub-linked Vercel project. Push to `main` triggers production deploy.
`develop` branch gets auto-generated preview URLs.  
**Rationale:** Zero-config CI/CD. Preview URLs enable testing before merge.

## ADR-004 — `.env.local` for API key, never committed
**Status:** Accepted  
**Decision:** `ANTHROPIC_API_KEY` in `.env.local` only. File in `.gitignore`.
API calls in `app/api/chat/route.ts` server-side only.  
**Rationale:** Security baseline. Client-side key exposure is a critical vulnerability.

## ADR-005 — Next.js App Router, no pages directory
**Status:** Accepted  
**Decision:** App Router throughout. No `/pages` directory.  
**Rationale:** Server components, streaming support, and edge runtime compatibility.

## ADR-006 — TypeScript throughout
**Status:** Accepted  
**Decision:** All source files in TypeScript. No `.js` files in `src/`.  
**Rationale:** Type safety catches KB structure mismatches at compile time.

## ADR-007 — Tailwind CSS v4
**Status:** Accepted  
**Decision:** Tailwind CSS v4 with native CSS variables for design tokens.  
**Rationale:** Tailwind v4 native CSS variable support makes VT brand tokens
available across both utility classes and custom CSS without duplication.

## ADR-008 — VT brand typography
**Status:** Accepted  
**Decision:** Acherus Grotesque (self-hosted, body), Crimson Text (Google Font, serif
headers), DM Mono (Google Font, code/metadata). No Inter, Roboto, Arial, or DM Sans.  
**Rationale:** VT brand compliance. Acherus Grotesque is the official VT body font.

## ADR-009 — Knowledge files as plain Markdown in `src/content/`
**Status:** Accepted  
**Decision:** All KB documents are `.md` files in `src/content/`. `knowledge.ts`
assembles them dynamically via `readdir`. No hardcoded file list required.  
**Rationale:** New KB files are committed without code changes. Syllabi pipeline output
drops directly into `src/content/`.

## ADR-010 — `system-prompt.ts` separate from knowledge layer
**Status:** Accepted  
**Decision:** `src/lib/system-prompt.ts` (hyphenated filename) exports
`buildSystemPrompt(context: string): string`. Knowledge assembly and prompt engineering
are separate concerns.  
**Rationale:** Prompt changes don't require touching knowledge retrieval logic.

## ADR-011 — Five-topic sidebar
**Status:** Accepted  
**Decision:** Two rows: Program | Admin (row 1), Core | Electives | Certs (row 2).
Type: `"program" | "admin" | "core" | "electives" | "certificates"`.  
**Rationale:** Maps to the natural divisions in how students ask MURP questions.
No "Plan" tab — degree map and audit are cross-cutting features triggered by chips.

## ADR-012 — MURP-only scope for Phase 2–3; MPIA in Phase 4
**Status:** Accepted  
**Decision:** Jane serves MURP graduate students only in Phases 2–3. MPIA expansion
in Phase 4 (note: MPIA CIP misclassification context — currently 45.1201, should be
45.0901).  
**Rationale:** Scope control. Full MURP KB must be proven before expansion.

## ADR-013 — Campus disambiguation required
**Status:** Accepted  
**Decision:** Blacksburg and Arlington/NCR are never merged. Campus nudge fires when
`topic === "core" && campus === null`. Queries prefixed `[Campus: X]` before send,
stripped before display.  
**Rationale:** Core course offerings differ materially between campuses.

## ADR-014 — Jane Jacobs persona
**Status:** Accepted  
**Decision:** Jane named after Jane Jacobs. References her ideas naturally, max once
per response. Dry Robert Moses humor on design/theory topics only. Planning pearls
in 1 of 4–5 responses, never for logistics. One register shift per response.  
**Rationale:** Personality differentiates Jane from a generic chatbot and reinforces
the planning discipline identity.

## ADR-015 — `syllabi_to_kb.py` pipeline for KB generation
**Status:** Accepted  
**Decision:** PDF syllabi and MURP theses converted to `.md` KB files via
`dev/syllabi_to_kb.py`. Output naming: `{course}_{campus}_{instructor}_{term}.md`.  
**Rationale:** Systematic KB generation. Reproducible. Output drops directly into
`src/content/` without manual formatting.

## ADR-016 — Opening message as pre-populated assistant turn
**Status:** Accepted  
**Decision:** `src/lib/opening-message.ts` exports `OPENING_MESSAGE`. Messages state
initialised with `[OPENING_MESSAGE]` in page.tsx. `clientOnly: true` flag prevents
it being sent to the API.  
**Rationale:** Avoids an empty chat on first load. Sets Jane's tone immediately.

## ADR-017 — Knowledge loading performance sequence
**Status:** Accepted  
**Decision:** Phase 3 extends `getContext()` to `getContext(query, topic?)`.
Stage 1: topic-based file filtering. Stage 2: intent-based override regexes (deadline,
funding, prereq, plan, audit). Stage 3 (Phase 4 if needed): vector RAG.  
**Rationale:** Most queries are answered by <30K words. Full-context loads are expensive
and unnecessary. RAG deferred until topic filtering proves insufficient.

## ADR-018 — All Playwright API calls mocked
**Status:** Accepted  
**Decision:** `test/jane.spec.ts` mocks all API responses. Content accuracy tested
manually. Automated tests cover UI behaviour only.  
**Rationale:** Prevents test flakiness from LLM non-determinism. Keeps CI fast.
Expected test count tracked in `check_repo.ps1` — update count after each sprint.

## ADR-019 — Three-icon feedback UX
**Status:** Accepted  
**Decision:** Feedback bar: 👍 (thumbs-up SVG) · 👎 (thumbs-down SVG) · 📋 (copy SVG).
Thumbs-down triggers internal ChatWindow escalation (clientOnly message). Copy button
has 2-second confirmation state. `ChatWindowProps` does NOT include `onFeedback`.  
**Rationale:** Minimal friction. Escalation stays internal to ChatWindow — Message
component exposes `onThumbsDown` callback; ChatWindow injects the clientOnly message.

## ADR-020 — No pipe tables in system prompt (SUPERSEDED by ADR-022)
**Status:** Superseded  
**Superseded by:** ADR-022  
**Original decision:** remark-gfm not installed; pipe tables render as raw text.
System prompt instructed Jane to use lists instead.

## ADR-021 — Official MURP course sequence (authoritative)
**Status:** Accepted  
**Decision:** Authoritative Year 1 sequence: Fall = UAP 5014, UAP 5234, UAP 5084.
Spring = UAP 5174, UAP 5224, UAP 5554. Core = 18 credits (6 courses). Total = 48.
Any Jane-generated degree plan must use these course numbers.  
**Rationale:** Previous plan documents used fabricated course numbers. This ADR locks
the correct sequence derived from `murp_course_sequence.md`.

## ADR-022 — Pipe tables now supported (supersedes ADR-020)
**Status:** Accepted  
**Decision:** `remark-gfm ^3` confirmed installed (package.json). Pipe tables render
correctly in `react-markdown`. Remove the `#Formatting` no-tables rule from
`src/lib/system-prompt.ts`. KB files may use pipe tables.  
**Rationale:** remark-gfm v3 added in Phase 2 (commit 6f94e56). ADR-020 constraint
no longer applies.  
**Action:** Remove "avoid pipe tables, use lists instead" from system-prompt.ts
`#Formatting` section.

## ADR-023 — Mode detection in route.ts, not knowledge layer
**Status:** Accepted  
**Decision:** `detectModeAddendum(query, history)` lives in `src/app/api/chat/route.ts`
only. It returns a string appended to the system prompt (structured JSON schemas for
DEGREE_PLAN and DEGREE_AUDIT modes), or `null` for all other queries.
`getContext()` return type is unchanged: `{ text: string, sources: string[] }`.  
**Rationale:** Preserves ADR-001/ADR-010 interface contract. Knowledge layer assembles
context; chat layer decides how to use it. Mode detection is a chat-layer concern.

## ADR-024 — Three-tier card rendering hierarchy
**Status:** Accepted  
**Decision:** Three tiers for structured output rendering in `Message.tsx`:
1. **Full-width card** (`DEGREE_PLAN`, `DEGREE_AUDIT`): replaces chat bubble entirely;
   maroon card header carries J avatar inline; mobile uses tabbed semesters (<640px),
   desktop uses 4-column grid (≥640px).
2. **Light card** (`FUNDING_MATCHES`, `THESIS_SUGGESTIONS`): inside normal assistant
   bubble with left-border accent; no full-width breakout.
3. **Prose** (conflict checker, deadlines, sample paths): normal ReactMarkdown bubble.
`tryParseStructured()` runs on `content.trimStart()` after streaming completes.
While structured output is generating, display `__BUILDING_PLAN__` placeholder.  
**Rationale:** Degree map grid is unreadable inside a constrained chat bubble. Funding
and thesis answers are naturally list-shaped and work as prose with light styling.

# SPIA Bot — Claude Code Session Context

This file is loaded automatically at the start of every Claude Code session.
Keep it concise. Full detail lives in the files listed below.

---

## What This Project Is

A departmental AI advising assistant for the MURP (Master of Urban and Regional Planning)
program at Virginia Tech's School of Public and International Affairs (SPIA).

Built in phases using the Strangler Fig pattern — the prototype is the skeleton, not a
throwaway. Each phase replaces internals without restructuring the application.

**Repo:** `spia-murp-advisor` (private GitHub)
**Deployment:** Vercel — auto-deploys on push to `main`
**Owner:** David Bieri (bieri@vt.edu)

---

## Read These Files Before Doing Anything

1. `README.md` — architecture, current scope, knowledge layers, file structure
2. `PROGRESS.md` — what's done, what's next, what's blocked, phase checklists
3. `DECISIONS.md` — only if you face an architecture question (16 ADRs)

After reading, summarise your understanding of current status and proposed next steps.
Wait for confirmation before writing any code.

---

## Current Phase: 2

**Goal:** Port Phase 1 React artifact to a hosted Next.js app on Vercel.
Same knowledge layer as Phase 1. No RAG yet. API route working before UI is built.

**Immediate next task:** See Phase 2 checklist in PROGRESS.md.

---

## Stack

- Next.js (App Router) · TypeScript · Tailwind CSS
- Anthropic SDK · model: `claude-sonnet-4-20250514`
- Vercel deployment (GitHub-linked, auto-deploy on push to `main`)
- Node.js 18+

---

## Non-Negotiable Rules

**Security**
- `ANTHROPIC_API_KEY` goes in `.env.local` ONLY — never in any client-side file
- `.env.local` is in `.gitignore` — never commit it
- API calls happen in `app/api/chat/route.ts` (server-side) only

**Architecture**
- `getContext(query)` lives in `lib/knowledge.ts` — this is the ONLY function the chat
  layer calls to retrieve knowledge
- The function signature `getContext(query) → { text: string, sources: string[] }`
  must never change between phases — only the implementation behind it changes
- Chat logic never imports raw document content directly

**Knowledge content**
- Source documents live in `content/` as plain markdown files — not embedded in TypeScript
- `lib/knowledge.ts` assembles content from `content/` files — it is an assembler, not a store
- `lib/systemPrompt.ts` handles system prompt assembly — separate from knowledge retrieval

**Branding**
- VT maroon: `#861F41`
- VT orange: `#E5751F`
- Font: DM Sans (body) · DM Serif Display (headings)

**Campus disambiguation**
- UAP 5174 policies differ substantially between Blacksburg (Bieri) and Arlington (Cowell)
- NEVER merge or average policies across campuses — always label `[Blacksburg]` / `[Arlington]`
- When campus is unknown, ask before answering policy questions

**Scope**
- Bot serves MURP graduate students only — no undergraduate courses
- Bot answers factual questions about documented policies — it does not make recommendations
- Every unanswerable question routes to a specific staff member with their email

---

## Knowledge Layer Structure

```
content/
├── spia_staff_contacts.md    Layer 1 — staff routing (who to contact for what)
├── murp_curriculum.md        Layer 2 — program structure, faculty, tuition
├── murp_electives.md         Layer 2b — curated cross-dept elective catalog
├── uap5174_bieri_s26.md      Layer 3 — Blacksburg syllabus (Bieri, Spring 2026)
└── uap5174_cowell_s24.md     Layer 3 — Arlington syllabus (Cowell, Spring 2024)
```

---

## Commit Conventions

- `feat:` new feature or capability
- `fix:` bug fix
- `docs:` documentation updates (README, DECISIONS, PROGRESS, this file)
- `content:` knowledge layer updates (content/ files or lib/knowledge.ts)
- `chore:` config, dependencies, .gitignore

Commit after every meaningful unit of work. Update PROGRESS.md before ending a session.

---

## Updating This File

Update the **Current Phase** section when a phase milestone is reached.
Everything else is stable across phases — do not expand this file with content
that belongs in README.md, DECISIONS.md, or PROGRESS.md.

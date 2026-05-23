# Jane (SPIA MURP Advisor Bot) — Claude Code Session Context

This file is loaded automatically at the start of every Claude Code session.
Keep it concise. Full detail lives in the files listed below.

---

## What This Project Is

**Jane** — a departmental AI advising assistant for the MURP (Master of Urban
and Regional Planning) program at Virginia Tech's School of Public and
International Affairs (SPIA). Named in the spirit of Jane Jacobs.

Students ask her about program requirements, course policies, faculty research,
and administrative contacts. She answers with warmth, precision, and the
occasional planning pearl.

Built in phases using the Strangler Fig pattern — the prototype is the
skeleton, not a throwaway. Each phase replaces internals without restructuring.

**Repo:** `spia-murp-advisor` (private GitHub)
**Live URL:** spia-murp-advisor.vercel.app
**Deployment:** Vercel — auto-deploys on push to `main`
**Owner:** David Bieri (bieri@vt.edu)

---

## Read These Files Before Doing Anything

1. `README.md` — architecture, current scope, knowledge layers, file structure
2. `PROGRESS.md` — what's done, what's next, what's blocked, phase checklists
3. `DECISIONS.md` — only if you face an architecture question (18 ADRs)

After reading, summarise your understanding of current status and proposed
next steps. Wait for confirmation before writing any code.

---

## Current Phase: 2 (complete) → Phase 3 beginning

**Phase 2 is largely complete.** The app is live on Vercel with the full
course KB, Jane's personality, and the revised topic sidebar.

**Immediate Phase 3 priorities:**
1. Feedback backend (Vercel KV) — before student exposure
2. Word count / token audit — run before or just after full KB commit
3. Topic-based context filtering (if audit shows >90K words)
4. Faculty research profiles
5. Program-level documents (requirements, graduation checklist, admissions, funding)
6. MPIA content (first program expansion — see ADR-012)

See PROGRESS.md for full Phase 3 checklist.

---

## Stack

- Next.js (App Router) · TypeScript · Tailwind CSS
- Anthropic SDK · model: `claude-sonnet-4-6`
- Vercel deployment (GitHub-linked, auto-deploy on push to `main`)
- Node.js 18+

**Dev environment:**
- Windows repo: `C:\Users\bieri\OneDrive\Documents\GitHub\spia-murp-advisor`
- All git operations in PowerShell only
- No npm at office computer — add dependencies to package.json manually;
  Vercel installs on build
- Claude Code runs in WSL Linux (separate environment from Windows repo)

---

## Non-Negotiable Rules

**Security**
- `ANTHROPIC_API_KEY` in `.env.local` ONLY — never in any client-side file
- `.env.local` in `.gitignore` — never commit it
- API calls in `app/api/chat/route.ts` (server-side) only

**Architecture**
- `getContext(query)` in `lib/knowledge.ts` is the ONLY function the chat
  layer calls for knowledge retrieval
- Signature `getContext(query) → { text: string, sources: string[] }` must
  never change between phases — only the implementation behind it changes

**Knowledge content**
- Source documents in `src/content/` as plain `.md` files
- `lib/knowledge.ts` assembles from `src/content/` — it is an assembler, not a store
- `lib/system-prompt.ts` (function `buildSystemPrompt(context)`) — separate from knowledge

**Branding**
- VT maroon: `#861F41` · VT orange: `#E5751F`

**Campus disambiguation**
- Many MURP core courses differ between Blacksburg and Arlington/NCR
- NEVER merge policies across campuses
- Campus nudge shows when `topic === "core" && campus === null`

**Scope**
- Jane serves MURP graduate students only — no undergraduate courses
- Factual answers only — no recommendations, no enrollment advice
- Every unanswerable question routes to a specific staff member with email

**Jane's personality**
- Named after Jane Jacobs — references her ideas naturally, once per response max
- Occasional dry Robert Moses humor — design/theory topics only, never emotional ones
- Planning pearls — one in four/five responses, never for logistics queries
- One register shift per response (Jacobs OR Moses OR pearl, not multiple)

---

## Knowledge Layer Structure (current)

```
src/content/
├── spia_staff_contacts.md          Staff routing — who to contact for what
├── murp_curriculum.md              Program structure, faculty, tuition
├── murp_electives.md               Cross-dept elective catalog
├── murp_faqs.md                    Common questions
├── murp_4plus1.md                  Accelerated 4+1 pathway
├── murp_certificates_detail.md     Certificate requirements
├── murp_course_sequence.md         Two-year sequence
├── murp_faculty_research.md        Faculty research areas
├── murp_student_life.md            Student orgs, internships
├── jacobs_concepts.md              Jane Jacobs knowledge base (synthesised)
├── planning_pearls.md              30 planning wisdom pearls
├── uap5174_blacksburg_bieri_s26.md UAP 5174 Blacksburg (Bieri, S26)
├── uap5174_arlington_cowell_s24.md UAP 5174 Arlington (Cowell, S24)
├── [uap/gia/spia]_*.md             Full course KB from syllabi_to_kb.py
│                                   Naming: {course}_{campus}_{modality}_{instructor}_{term}.md
├── thesis_*.md                     MURP thesis KB (research scope, methods, curriculum links)
└── murp_rubric_*.md                Thesis/final project evaluation rubric
```

**Syllabi pipeline:** `dev/syllabi_to_kb.py`
Converts PDF syllabi and MURP theses to structured `.md` KB files.
See DECISIONS.md ADR-015 for design rationale and usage.

---

## Commit Conventions

- `feat:` new feature or capability
- `fix:` bug fix
- `docs:` documentation updates (README, DECISIONS, PROGRESS, CLAUDE.md)
- `content:` knowledge layer updates (src/content/ files or lib/knowledge.ts)
- `ui:` component or styling changes
- `chore:` config, dependencies, .gitignore

Commit after every meaningful unit of work.
Update PROGRESS.md before ending a session.

---

## Updating This File

Update **Current Phase** and **Knowledge Layer Structure** when changes occur.
Everything else is stable. Do not expand with content that belongs in
README.md, DECISIONS.md, or PROGRESS.md.

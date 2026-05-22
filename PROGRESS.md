# SPIA Bot — Implementation Progress

**Current phase:** Phase 2 (in progress — frontend next)
**Last updated:** 2026-05-21

---

## Phase 1 — Working Prototype
*Goal: React artifact with clean two-layer architecture and full knowledge base*

### Architecture
- [x] Two-layer separation established (knowledge / chat)
- [x] `getContext()` interface contract defined
- [x] System prompt design validated
- [x] Campus disambiguation logic implemented (Blacksburg vs Arlington)
- [x] Three-tier knowledge hierarchy designed (staff / program / course)

### Knowledge Layer — Layer 1 (Staff Routing)
- [x] SPIA Staff Contact Map parsed from Lucidspark JSON
- [x] Staff routing table encoded in knowledge const
- [x] Routing rules added to system prompt
- [ ] **OPEN:** Confirm Graduate Certificates split (Crist vs Gilmore) with Kelly Crist

### Knowledge Layer — Layer 2b (MURP Elective Course Ecosystem)
*Source: Course_Tracking.xlsx — 69 courses, 9 departments*
*Implemented in `src/content/murp_electives.md` (Phase 2) rather than Phase 1 React const*
- [x] Natural Resources enrollment caveat (OMNR not XMNR; campus override via MNR dept)
- [x] NR certificate note (Natural Resources, Watershed Management, Environmental GIS)
- [x] Concentration → course mapping (top 4–5 courses per concentration, 7 concentrations)
- [x] Key scheduling notes (NR 5014 Summer III only; NR 5114 study abroad caveat; CEE 5204 retirement flag)
- [x] 7 stale courses flagged as uncertain availability
- [x] 3 new CEE transportation courses and 3 upcoming TBD NR courses noted
- [x] MURP curriculum: all 6 core courses with descriptions
- [x] Elective concentrations (7 tracks)
- [x] Capstone vs thesis distinction
- [x] Graduate certificates (7 options)
- [x] Dual degree options
- [x] Campus comparison (Blacksburg vs Arlington)
- [x] Application deadlines
- [x] Tuition 2025–2026
- [x] Student outcomes data
- [x] Full UEPP faculty roster with emails and offices
- [x] Community Scholars Fellowship

### Knowledge Layer — Layer 3 (UAP 5174)
- [x] Blacksburg section: Bieri Spring 2026 syllabus ingested
- [x] Arlington section: Cowell Spring 2024 syllabus ingested
- [x] Grade breakdowns (both)
- [x] Reflection policies (both — documented 12 differences)
- [x] Debate schedules (both)
- [x] Final project requirements (both)
- [x] Late policies (both)
- [x] Required texts (both)
- [x] AI policy (Bieri detailed; Cowell absent — flagged)
- [x] Office hours (both)
- [x] Weekly schedule/curriculum (Bieri full; Cowell full)

### UI / Prototype
- [x] Phase 1 v1: MURP-only bot (rendered successfully)
- [x] Phase 1 v2: UAP 5174 dual-campus bot with campus toggle (rendered successfully)
- [ ] **OPEN:** Phase 1 v3: Combined three-layer bot (render timeout — code size issue; fix needed)

### Documentation
- [x] DECISIONS.md — 18 ADRs recorded
- [x] README.md — project overview and architecture
- [x] PROGRESS.md — this file

### Pending Decisions
- [x] REAL 2004: **excluded** — grad-only bot; separate standalone course bot if undergraduate support needed (ADR-011)
- [x] MPA/MPIA: **shallow routing only through Phase 2** — MPIA first in Phase 3 expansion due to enrollment risk and CIP misclassification (ADR-012)
- [ ] Staff contact governance: **action required** — email Kelly Crist: (1) confirm Gilmore/Crist certificate split, (2) establish semester-start accuracy review cadence. Agreed structure: Kelly Crist = content owner; David = technical owner (edit + redeploy)

---

## Phase 2 — Hosted Web Application
*Goal: Next.js app on Vercel with shareable URL; same knowledge layer as Phase 1*

**Layout note:** Project uses `src/` directory layout — confirmed. Content folder is `src/content/`. (ADR-017)

**Environment note:** Claude Code runs in WSL Linux; Windows repo is at `C:\Users\bieri\Documents\GitHub\spia-murp-advisor`. These are separate filesystems. Claude Code prints file contents; David creates files manually in Windows via Notepad. (ADR-018 — see below)

### GitHub Setup
- [x] Create `spia-murp-advisor` repo on GitHub (private)
- [x] Clone repo locally
- [x] Copy README.md, DECISIONS.md, PROGRESS.md, CLAUDE.md into cloned folder
- [x] First commit — docs only
- [x] Push
- [x] Resolved unrelated histories (WSL vs Windows git init conflict)
- [x] Default branch set to `main` on GitHub
- [x] `.gitignore` merge conflict resolved

### Project Scaffold
- [x] `npx create-next-app@latest` with TypeScript, Tailwind, App Router
- [x] `.gitignore` in place and clean
- [x] `.env.local` created with real `ANTHROPIC_API_KEY` (never committed)
- [x] `content/` folder confirmed at `src/content/`
- [x] Scaffold committed and pushed
- [x] Node.js v24 installed on Windows
- [x] PowerShell execution policy set to RemoteSigned
- [x] `@anthropic-ai/sdk` installed and in `package.json`

### Vercel Connection
- [ ] Log in to vercel.com → Add New Project → Import from GitHub
- [ ] Select `spia-murp-advisor` repo
- [ ] Add `ANTHROPIC_API_KEY` in Vercel environment variables
- [ ] Confirm auto-deploy on push to `main`

### content/ Folder
- [x] `src/content/spia_staff_contacts.md`
- [x] `src/content/murp_curriculum.md`
- [x] `src/content/murp_electives.md`
- [x] `src/content/uap5174_bieri_s26.md`
- [x] `src/content/uap5174_cowell_s24.md`
- [x] Committed and pushed

### Server-Side API Route
- [x] `src/app/api/chat/route.ts` created and in Windows repo
- [x] JSON body validation (message shape + at least one user turn)
- [x] Last 10 messages sent to `claude-sonnet-4-6` (1000 max tokens)
- [x] `src/lib/systemPrompt.ts` created and in Windows repo
- [x] `src/lib/knowledge.ts` reads all five `src/content/` files via `fs/promises`
- [x] `getContext()` returns concatenated content with labeled separators
- [x] Typed Anthropic error handling
- [x] Real API key in `.env.local` — tested and working
- [x] **All three curl tests passing:**
  - [x] Admissions → Tyler Wiltshire (wilt15@vt.edu) ✅
  - [x] UAP 5174 reflection policy → campus disambiguation triggered ✅
  - [x] Travel reimbursement → Shelley Adkins (sladkins@vt.edu) ✅

### Frontend ← NEXT
- [ ] Port chat UI from React artifact to Next.js components
- [ ] Implement campus toggle state
- [ ] Implement topic tab switching (Program / UAP 5174 / Admin)
- [ ] Port quick-question sidebar buttons
- [ ] VT branding (maroon #861F41, orange #E5751F)
- [ ] Mobile-responsive layout
- [ ] Commit: `git commit -m "feat: chat UI components"`

### Feedback Mechanism (add in Phase 2, not Phase 5)
- [ ] Thumbs-down button logs query + response to server (anonymous)
- [ ] Log stored in Vercel KV store or append-only file
- [ ] Review logged failures before each semester-start content refresh
- [ ] Commit: `git commit -m "feat: anonymous feedback logging"`

### Scope Statement (visible in UI)
- [ ] Scope pill visible at all times ("MURP / UEPP")
- [ ] Footer disclaimer: "For official decisions, confirm with your advisor"
- [ ] About/scope tooltip explaining what the bot covers and what it doesn't

### Deployment and Testing
- [ ] Push to `main` → confirm Vercel auto-deploys
- [ ] Set `ANTHROPIC_API_KEY` in Vercel dashboard
- [ ] Test on live URL
- [ ] Share URL with 2–3 SPIA colleagues for testing

### Remaining Testing Checklist (before sharing)
- [x] Admissions question routes to Tyler Wiltshire
- [ ] Assistantship question routes to Kelly Crist (kcrist@vt.edu)
- [ ] Arlington question routes to Elia Amegashie (elia@vt.edu)
- [ ] NR elective question surfaces OMNR-not-XMNR caveat
- [x] Reflection policy question triggers campus disambiguation
- [ ] Late policy shows both versions when campus not specified
- [ ] Out-of-scope question redirects gracefully (no hallucination)
- [ ] AI policy question shows Bieri policy + Arlington caveat
- [x] Travel reimbursement routes to Shelley Adkins

---

## Phase 3 — RAG Pipeline
*Goal: Replace hardcoded knowledge stub with vector retrieval; expand program scope*

### Trigger Conditions (revisit when any are true)
- [ ] >2–3 additional courses added to scope
- [ ] Answer quality degradation on specific topics observed
- [ ] Need for automatic document refresh

### Document Preparation
- [ ] Export knowledge layers to markdown files (`content/`)
- [ ] Define chunking strategy (by section, ~500 tokens/chunk)
- [ ] Define metadata schema (`program`, `campus`, `tier`, `source`, `updated`)

### Embedding Pipeline
- [ ] Choose embedding model (OpenAI `text-embedding-3-small` or Anthropic-compatible)
- [ ] Set up vector store (Chroma locally → pgvector for production)
- [ ] Write ingestion script (`ingest.ts`)
- [ ] Test retrieval quality on known queries

### Swap getContext()
- [ ] Replace Phase 1 stub with vector similarity search
- [ ] Implement metadata filtering (e.g., campus=blacksburg for campus-specific queries)
- [ ] Implement source citation (populate `sources[]` in return object)
- [ ] Verify chat layer unchanged

### Scope Expansion (Phase 3)
- [ ] MPIA curriculum *(first priority — see ADR-012)*
- [ ] MPA curriculum
- [ ] PGG overview
- [ ] CPAP overview
- [ ] Additional UEPP courses (UAP 5014, 5084, 5224, 5234, 5554)
- [ ] Full elective catalog RAG ingestion (69 courses from Course_Tracking.xlsx)
  - [ ] Resolve GEOG 5314 duplicate with Geography dept before ingestion
  - [ ] Resolve NR 5884 duplicate with NR dept before ingestion
  - [ ] Assign TBD course codes when available
  - [ ] Tag each course with `concentration_area` metadata (manual curation)
  - [ ] Tag each course with `campus`, `modality`, `has_prereq` metadata

---

## Phase 4 — Department-Wide Deployment
*Goal: VT CAS authentication, full program scope, document ingestion pipeline*

- [ ] VT IT engagement for CAS/SSO integration
- [ ] Implement OAuth/CAS authentication in Next.js
- [ ] Build document ingestion pipeline (PDF → chunks → embeddings)
- [ ] Establish governance: document ownership, update cadence, review process
- [ ] Expand to full SPIA program scope with metadata filtering
- [ ] ASPECT PhD absorption context (if relevant by Phase 4)

---

## Phase 5 — Production Hardening
*Goal: Reliability, observability, governance*

- [ ] Query logging (anonymous — what questions are failing?) — extend Phase 2 feedback mechanism
- [ ] Automated testing suite for known queries
- [ ] Staff contact refresh automation or manual review cadence
- [ ] Syllabus ingestion trigger (start of each semester)

---

## Blocked / Waiting

| Item | Blocked on | Owner |
|---|---|---|
| Phase 1 v3 render fix | Widget code size — needs compact implementation | Claude Code |
| Gilmore/Crist cert split | Email to Kelly Crist (not yet sent) | David |
| Staff governance cadence | Same email to Kelly Crist | David |
| GEOG 5314 duplicate | Confirm two separate courses with Geography dept | David |
| NR 5884 duplicate | Confirm correct course numbers with NR dept | David |
| 3 TBD NR course codes | Track when assigned; update spreadsheet | David |

---

## Decisions Log Summary
*(Full records in DECISIONS.md)*

| # | Decision | Date |
|---|---|---|
| ADR-001 | Two-layer architecture | 2026-05-20 |
| ADR-002 | Hardcoded stub for Phase 1 | 2026-05-20 |
| ADR-003 | Option B scope (deep MURP only) | 2026-05-20 |
| ADR-004 | Three-tier knowledge hierarchy | 2026-05-20 |
| ADR-005 | Campus disambiguation rule | 2026-05-20 |
| ADR-006 | Strangler Fig pattern | 2026-05-20 |
| ADR-007 | Dev environment split | 2026-05-20 |
| ADR-008 | Staff routing as distinct layer | 2026-05-20 |
| ADR-009 | React artifact → Next.js | 2026-05-20 |
| ADR-010 | getContext() interface contract | 2026-05-20 |
| ADR-011 | REAL 2004 excluded (grad-only) | 2026-05-20 |
| ADR-012 | MPA/MPIA shallow Phase 2; MPIA first in Phase 3 | 2026-05-20 |
| ADR-013 | Elective catalog as Layer 2b; curated stub Phase 1/2; full RAG Phase 3 | 2026-05-20 |
| ADR-014 | Dedicated private GitHub repo (`spia-murp-advisor`) | 2026-05-20 |
| ADR-015 | Vercel linked to GitHub; GitHub as canonical source | 2026-05-20 |
| ADR-016 | content/ folder for human-readable knowledge sources | 2026-05-20 |
| ADR-017 | src/ directory layout; claude-sonnet-4-6 model string | 2026-05-21 |
| ADR-018 | Claude Code runs in WSL — file transfer protocol | 2026-05-21 |

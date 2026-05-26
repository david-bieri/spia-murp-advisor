# Jane — SPIA MURP Academic Advisor

AI advising assistant for Virginia Tech's Master of Urban and Regional Planning
(MURP) program. Named in the spirit of Jane Jacobs.

**Live:** spia-murp-advisor.vercel.app  
**Stack:** Next.js · TypeScript · Tailwind v4 · Anthropic SDK (`claude-sonnet-4-6`)  
**Deployment:** Vercel (auto-deploy on push to `main`)

---

## Branch structure

| Branch | Purpose | URL |
|---|---|---|
| `main` (e841dc5) | Stable — colleague testing | spia-murp-advisor.vercel.app |
| `develop` | Phase 3 feature work | Vercel preview (auto-generated) |

---

## Design principles

**Accuracy over coverage.** A bot that answers 40 questions correctly is more
valuable than one that attempts 100 and gets 30 wrong. Scope discipline is the design.

**Informational, not advisory.** Jane answers factual questions about documented
policies. She does not recommend concentrations, thesis vs studio, or enrollment
choices. Restricting to factual questions is also the primary bias mitigation
strategy — recommendation surfaces are where AI advising tools exhibit demographic
bias.

**Explicit escalation paths.** Every unanswerable question routes to a specific
human with a specific email. A dead end erodes trust faster than a wrong answer.

**Character.** Jane is named after Jane Jacobs. She weaves Jacobs' ideas into
relevant answers naturally, keeps a dry running commentary on Robert Moses for
design and theory topics, and occasionally drops an unsolicited planning pearl.
One register shift per response; none for logistics or emotionally weighted queries.

**Staleness is the primary failure mode.** Academic information has a decay rate.
The syllabi pipeline (`dev/syllabi_to_kb.py`) makes semester-start KB refresh a
one-command operation. Governance (named content owners, review cadence) is
not optional.

---

## Architecture

### Data flow

```
┌─────────────────────────────────────────────┐
│              User Interface                  │
│           Next.js (App Router)               │
│   Sidebar: Campus toggle + 5 topic tabs      │
│   ChatWindow: Opening message + chips        │
└──────────────────┬──────────────────────────┘
                   │ user query
┌──────────────────▼──────────────────────────┐
│         app/api/chat/route.ts                │
│   buildSystemPrompt(context) + history       │
│   detectModeAddendum(query, history)         │
│   Calls getContext(query, topic?) only       │
└──────────────────┬──────────────────────────┘
                   │ getContext(query, topic?)
                   │ → { text, sources }
┌──────────────────▼──────────────────────────┐
│           lib/knowledge.ts                   │
│  Layer 1: staff contacts (always loaded)     │
│  Layer 2: topic-filtered program files       │
│  Layer 3: course-specific on course# match  │
│  Layer 4: intent-matched supplementary       │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│           Anthropic API                      │
│    claude-sonnet-4-6 · max_tokens: 1000      │
└─────────────────────────────────────────────┘
```

### File structure

```
src/
├── app/
│   ├── page.tsx                    Root — state management, topic + campus
│   ├── layout.tsx                  Fonts (Acherus + Crimson Text + DM Mono)
│   └── api/
│       ├── chat/route.ts           Chat API — streaming, detectModeAddendum()
│       └── feedback/route.ts       Feedback stub (Phase 2 completion)
├── components/
│   ├── ChatWindow.tsx              Main chat UI, nudges, escalation
│   ├── Message.tsx                 ReactMarkdown + remark-gfm + JSON detection
│   ├── Sidebar.tsx                 Campus toggle, 5 topic tabs, quick questions
│   ├── StarterPrompts.tsx          Starter chips (rounded-full)
│   ├── StreamingCursor.tsx         Blinking cursor during streaming      [P3]
│   ├── DegreePlanCard.tsx          Full-width degree map card            [P3]
│   ├── DesktopGrid.tsx             4-column semester grid (≥640px)       [P3]
│   ├── MobileTabs.tsx              Tabbed semester view (<640px)         [P3]
│   ├── DegreeAuditCard.tsx         Progress bar + completion split       [P3]
│   └── StructuredCards.tsx         ThesisTopicCard + FundingCard         [P3]
├── hooks/
│   └── useAcademicAdvisor.ts       Plan state, types, credit metrics     [P3]
├── lib/
│   ├── knowledge.ts                getContext(query, topic?) — assembler
│   ├── system-prompt.ts            buildSystemPrompt(context) — prompt builder
│   ├── opening-message.ts          Pre-populated opening message
│   └── useStreamingChat.ts         Streaming fetch hook                  [P3]
└── content/                        KB .md files — see Knowledge Layers below
```

`[P3]` = Phase 3 addition (on `develop` branch)

---

## Knowledge layers

**Layer 1 — Staff routing (always loaded)**
- `spia_staff_contacts.md` — who handles what; fallback for every unanswerable question

**Layer 2 — Program knowledge (loaded by topic)**
- `murp_curriculum.md` — degree structure, faculty, tuition, 4+1 pathway
- `murp_course_sequence.md` — official two-year sequence (authoritative, ADR-021)
- `murp_certificates_detail.md` — certificate requirements
- `murp_electives.md` — cross-department elective catalog
- `murp_faqs.md` — common questions (application, GPA, financial aid, graduation)
- `murp_4plus1.md` — accelerated 5-year program
- `murp_faculty_research.md` — faculty research areas and contacts
- `murp_student_life.md` — student orgs, internships, travel
- `jacobs_concepts.md` — Jane Jacobs ideas (synthesised)
- `planning_pearls.md` — 30 planning pearls

**Layer 3 — Course-specific (loaded when course number in query)**
- `uap5174_blacksburg_bieri_s26.md` — UAP 5174 Blacksburg (Bieri, S26)
- `uap5174_arlington_cowell_s24.md` — UAP 5174 Arlington (Cowell, S24)
- `[course]_[campus]_[instructor]_[term].md` — full pipeline KB (80+ files)
- `thesis_*.md` — MURP thesis examples and methods
- `murp_rubric_*.md` — evaluation rubrics

**Layer 4 — Phase 3 supplementary (loaded by intent)**
- `murp_prerequisites.md` — prereq chains, campus constraints, sequencing rules
- `murp_sample_paths.md` — anonymised composite student paths by focus area
- `murp_deadlines.md` — academic calendar deadlines, GA application windows
- `murp_funding.md` — fellowships, GAs, scholarships with amounts and deadlines

**Layer 2 data quality issues (resolve before Phase 3 RAG ingestion):**
- GEOG 5314 listed twice with different titles — confirm with Geography dept
- NR 5884 listed twice with different courses — confirm numbers with NR dept
- 3 NR courses with TBD codes — track when assigned

---

## Key design decisions

**`getContext()` interface (ADR-001/010):**
`getContext(query, topic?) → { text: string, sources: string[] }` is the phase
boundary contract. Never change the return type.

**Mode detection (ADR-023):**
`detectModeAddendum(query, history)` in `route.ts` appends structured JSON schemas to
the system prompt for DEGREE_PLAN and DEGREE_AUDIT modes. Mode detection is a chat-layer
concern, not a knowledge-layer concern.

**Card rendering tiers (ADR-024):**
- Full-width card: DEGREE_PLAN, DEGREE_AUDIT (break out of chat bubble)
- Light card: FUNDING_MATCHES, THESIS_SUGGESTIONS (inside bubble, left-border accent)
- Prose: conflict checker, deadlines, sample paths (normal ReactMarkdown)

**Mobile-first layout:**
DegreePlanCard renders `<MobileTabs>` below 640px (one semester at a time) and
`<DesktopGrid>` at 640px and above. No horizontal scroll.

**Streaming-to-card transition:**
While structured output is generating, `useStreamingChat.ts` detects
`content.trimStart().startsWith('{"type":"DEGREE')` and shows a "Building your
plan…" placeholder. Card renders when `[DONE]` fires and `tryParseStructured()`
succeeds.

---

## Course type colour system (VT extended palette)

| Type | Background | Text | VT colour name |
|---|---|---|---|
| Core required | `#F5EEF1` | `#861F41` | Maroon tint |
| Elective | `#F5F3F0` | `#75787B` | Hokie Stone tint |
| Certificate | `#FEF3EC` | `#CF4520` | Burnt Orange tint |
| Thesis/capstone | `#EBF5EF` | `#009B77` | Forest tint |

---

## Dev workflow

```powershell
# Dev server (WSL or Windows)
npm run dev

# Deploy (push to main = production; push to develop = preview)
git add . && git commit -m "feat: ..." && git push

# Tests
npx playwright test
npx playwright test --grep "Load and opening|Nudges"
cmd /c "npx playwright show-report"

# Repo integrity check
powershell -ExecutionPolicy Bypass -File .\check_repo.ps1   # expected: 69/0

# Pre-deploy static check
python dev/pre_deploy_check.py

# KB refresh (semester start)
# 1. Run pipeline on updated syllabi folder
python dev/syllabi_to_kb.py `
  --folder "C:\path\to\syllabi" `
  --out "C:\path\to\kb_output" `
  --prefix UAP GIA SPIA `
  --thesis-folder "MURP thesis"
# 2. Review output — check kb_results.csv for failures before copying
# 3. Copy to repo
Copy-Item "C:\path\to\kb_output\*.md" "src\content\"
# 4. Commit and deploy
git add src/content/
git commit -m "content: semester refresh [term]"
git push

# Word count audit
Get-ChildItem src\content -Filter *.md | Get-Content | Measure-Object -Word
```

**Office computer constraint:** No npm available. Add dependencies to `package.json`
manually; Vercel installs on build.

---

## Phase history

| Phase | Scope | Status |
|---|---|---|
| 1 | Prototype: basic chat, single KB file, no persona | Complete |
| 2 | Hosted app, full course KB, Jane persona, Playwright suite | Complete |
| 3 | Topic filtering, structured output, degree map, audit | In progress |
| 4 | MPIA expansion, drag-and-drop plan editing, feedback backend | Planned |
| 5 | VT CAS authentication | Planned |

---

## People

| Person | Role | Contact |
|---|---|---|
| David Bieri | Owner, Core Faculty SPIA | bieri@vt.edu |
| Todd Schenk | First tester, MURP advisor | tschenk@vt.edu |
| Dara Wald | First tester, UAP faculty | — |
| Kelly Crist | Graduate assistantships | kcrist@vt.edu |
| Tyler Wiltshire | Admissions | wiltshire@vt.edu |
| Shelley Adkins | Travel reimbursement | sladkins@vt.edu |

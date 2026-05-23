# Jane — VT SPIA MURP Advising Bot

**Status:** Phase 2 complete · Phase 3 beginning
**Last updated:** 2026-05-23
**Owner:** David Bieri (bieri@vt.edu), Core Faculty, VT SPIA
**Live URL:** spia-murp-advisor.vercel.app

---

## What This Is

**Jane** is a departmental AI advising assistant for the MURP (Master of Urban
and Regional Planning) program at Virginia Tech's School of Public and
International Affairs (SPIA). Named in the spirit of Jane Jacobs.

Students ask Jane about program requirements, course policies, faculty research
areas, and administrative contacts. She answers factual questions about
documented policies; she does not make recommendations or enrollment decisions.

Built in phases following the Strangler Fig pattern: the prototype is the system
skeleton, not a throwaway. Each phase replaces internals without restructuring.

---

## Current Scope (Phase 2)

**Covered:**
- MURP curriculum: core courses, concentrations, certificates, Plan A/B, dual degrees
- Full course KB: UAP, GIA, and SPIA courses generated from syllabi via pipeline
  — campus-specific variants (Blacksburg / Arlington/NCR)
  — modality-specific variants (In-Person / Hybrid / Online)
- MURP thesis KB: past thesis research scope, methods, and curriculum connections
- Thesis evaluation rubric
- UEPP faculty research areas (for thesis advising)
- SPIA administrative staff routing (who to contact for what)
- Student life, internships, funding

**Not yet covered (Phase 3):**
- MPIA curriculum detail *(first expansion — enrollment risk + CIP misclassification
  make this a recruitment instrument; see ADR-012)*
- MPA curriculum detail
- PGG curriculum detail
- CPAP curriculum detail
- Faculty research profiles (individual pages — in queue)
- Program-level documents (graduation checklist, admissions requirements, funding guide)

**Out of scope (permanent):**
- Financial aid decisions
- Individual plan-of-study advice
- Grade disputes
- Admissions decisions
- REAL 2004 and other undergraduate courses *(see ADR-011)*

---

## Design Principles

**Accuracy over coverage.** A bot that answers 40 questions correctly is more
valuable than one that attempts 100 and gets 30 wrong. Scope discipline is the design.

**Informational, not advisory.** Jane answers factual questions about documented
policies. She does not recommend concentrations, thesis vs studio, or enrollment
choices. Restricting to factual questions is also the primary bias mitigation
strategy — recommendation surfaces are where AI advising tools exhibit demographic bias.

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
│   Calls getContext(query) only               │
└──────────────────┬──────────────────────────┘
                   │ getContext(query)
                   │ → { text, sources }
┌──────────────────▼──────────────────────────┐
│           lib/knowledge.ts                   │
│  Phase 2: reads all src/content/*.md         │
│  Phase 3: topic-filtered subset              │
│  Phase 4+: RAG (when genuinely needed)       │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│           Anthropic API                      │
│    claude-sonnet-4-6 · max_tokens: 1000      │
└─────────────────────────────────────────────┘
```

**Critical interface (do not change between phases):**
```typescript
getContext(query: string): Promise<{ text: string; sources: string[] }>
```

---

## Knowledge Sources

| Layer | Content | Source | Status |
|---|---|---|---|
| Staff routing | SPIA contact map | Lucidspark JSON | ✅ Live |
| Program | MURP curriculum, faculty, tuition | spia.vt.edu | ✅ Live |
| Electives | Cross-dept catalog (69 courses, 9 depts) | Course_Tracking.xlsx | ✅ Live |
| Jacobs | Jane Jacobs concepts (synthesised) | jacobs_concepts.md | ✅ Live |
| Pearls | Planning wisdom library (30 pearls) | planning_pearls.md | ✅ Live |
| Course syllabi | UAP / GIA / SPIA courses | syllabi_to_kb.py pipeline | ✅ Live |
| MURP theses | Research scope, methods, curriculum links | syllabi_to_kb.py pipeline | ✅ Live |
| Rubric | Thesis / final project evaluation criteria | syllabi_to_kb.py pipeline | ✅ Live |
| Faculty profiles | Individual research + advising pages | — | ⬜ Phase 3 |
| MPIA curriculum | Program content, courses, careers | — | ⬜ Phase 3 |

**Layer 2 data quality issues (resolve before Phase 3 RAG ingestion):**
- GEOG 5314 listed twice with different titles — confirm with Geography dept
- NR 5884 listed twice with different courses — confirm numbers with NR dept
- 3 NR courses with TBD codes — track when assigned

---

## KB Refresh (semester start)

```powershell
# 1. Run pipeline on updated syllabi folder
python dev\syllabi_to_kb.py `
  --folder "C:\path\to\syllabi" `
  --out "C:\path\to\kb_output" `
  --prefix UAP GIA SPIA `
  --thesis-folder "MURP thesis"

# 2. Review output files, check kb_results.csv for failures

# 3. Copy to repo
Copy-Item "C:\path\to\kb_output\*.md" "src\content\"

# 4. Commit and deploy
git add src/content/
git commit -m "content: semester refresh [term]"
git push
```

---

## Phase Roadmap

| Phase | Description | Status |
|---|---|---|
| 1 | React artifact prototype, hardcoded knowledge | ✅ Complete |
| 2 | Hosted Next.js app on Vercel, full course KB, Jane persona | ✅ Complete |
| 3 | Topic filtering, faculty profiles, MPIA expansion | 🔄 In progress |
| 4 | Department-wide scope, VT CAS authentication | ⬜ Planned |
| 5 | Production hardening, logging, governance | ⬜ Planned |

---

## File Structure

```
spia-murp-advisor/
├── README.md
├── DECISIONS.md              18 ADRs
├── PROGRESS.md               Phase checklists
├── CLAUDE.md                 Claude Code session context (auto-loaded)
├── src/
│   ├── app/
│   │   ├── layout.tsx        Page title: "Jane — MURP Advising, VT SPIA"
│   │   ├── page.tsx          Root — state, handleSend, OPENING_MESSAGE init
│   │   └── api/chat/
│   │       └── route.ts      Server-side API handler
│   ├── components/
│   │   ├── ChatWindow.tsx    Chat UI, scopeLabel, campus nudge
│   │   ├── Sidebar.tsx       Campus toggle + 5 topic tabs (2 rows)
│   │   ├── Message.tsx       Message bubble component
│   │   └── StarterPrompts.tsx 6 clickable starter chips
│   ├── lib/
│   │   ├── knowledge.ts      getContext() — loads src/content/*.md
│   │   ├── system-prompt.ts  buildSystemPrompt(context) — Jane's full prompt
│   │   └── opening-message.ts OPENING_MESSAGE constant
│   └── content/              KB source documents (.md)
│       ├── spia_staff_contacts.md
│       ├── murp_*.md         Program-level knowledge
│       ├── jacobs_concepts.md
│       ├── planning_pearls.md
│       ├── [course]_[campus]_[modality]_[instructor]_[term].md
│       ├── thesis_[author]_[year].md
│       └── murp_rubric_*.md
└── dev/
    └── syllabi_to_kb.py      PDF → .md pipeline (syllabi + theses + rubrics)
```

---

## Quick Reference: Key Contacts

| Role | Person | Email |
|---|---|---|
| Admissions (all programs) | Tyler Wiltshire | wilt15@vt.edu |
| Grad assistantships | Kelly Crist | kcrist@vt.edu |
| Arlington campus admin | Elia Amegashie | elia@vt.edu |
| Travel & purchasing | Shelley Adkins | sladkins@vt.edu |
| Budget, grants, compliance | Erin Thompson | elcline@vt.edu |
| Undergrad advising | Chris LaPlante | chrisl@vt.edu |
| UEPP Chair | Todd Schenk | tschenk@vt.edu |
| Project owner | David Bieri | bieri@vt.edu |

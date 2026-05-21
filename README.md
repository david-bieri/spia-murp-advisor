<<<<<<< HEAD
# SPIA Bot — VT School of Public and International Affairs

**Status:** Phase 1 complete (prototype) · Phase 2 next (hosted app)
**Last updated:** 2026-05-20
**Owner:** David Bieri (bieri@vt.edu), Core Faculty, VT SPIA
**Repo:** `spia-murp-advisor` (private) · **Deploys to:** Vercel (GitHub-linked, auto-deploy on push to `main`)

---

## What This Is

A departmental AI assistant for the MURP (Master of Urban and Regional Planning) program at Virginia Tech's School of Public and International Affairs (SPIA). Students can ask about program requirements, course policies, and administrative contacts.

Built in phases following the Strangler Fig pattern: the prototype is the system skeleton, not a throwaway. Each phase replaces internals without changing the skeleton.

---

## Current Scope (Phase 1)

**Covered:**
- MURP curriculum: core courses, concentrations, certificates, capstone vs thesis, dual degrees
- UEPP faculty contacts (full roster with emails and offices)
- UAP 5174 Planning Theory & History — both campuses:
  - Blacksburg section: Prof. Bieri, Spring 2026
  - Arlington section: Prof. Cowell, Spring 2024
- SPIA administrative staff routing (who to contact for what)
- Campus comparison: Blacksburg vs Arlington
- Tuition, application deadlines, student outcomes

**Not yet covered (planned for Phase 3 expansion):**
- MPIA curriculum detail *(Phase 3 first priority — enrollment risk + CIP misclassification make this a recruitment instrument, not just content; see ADR-012)*
- MPA curriculum detail
- PGG curriculum detail
- CPAP curriculum detail
- Other UEPP courses (UAP 5014, 5084, 5224, 5234, 5554)
- Full elective course catalog (69 courses) *(curated stub in Phase 1/2; full RAG ingestion Phase 3; see ADR-013)*

**Out of scope (permanent):**
- Financial aid decisions
- Individual plan-of-study advice
- Grade disputes
- Admissions decisions
- REAL 2004 and other undergraduate courses *(excluded by design — separate standalone course bot if needed; see ADR-011)*

---

## Design Principles

**Accuracy over coverage.** A bot that answers 40 questions correctly is more valuable than one that attempts 100 and gets 30 wrong. Scope discipline is not a limitation — it is the design.

**Informational, not advisory.** The bot answers factual questions about documented policies. It does not recommend concentrations, advise on thesis vs studio, or make enrollment judgments. Keeping the bot informational rather than advisory is also the primary bias mitigation strategy: research shows AI advising tools exhibit statistically significant demographic bias when making recommendations. Restricting the bot to factual policy questions eliminates the recommendation surface where bias enters.

**Explicit escalation paths.** Every unanswerable question routes to a specific human with a specific email. A dead end erodes trust faster than a wrong answer.

**Staleness is the primary failure mode.** Academic information has a decay rate. Governance (named content owners, semester-start review) is not optional infrastructure — it is what keeps the bot accurate after launch.

**Scope statements are visible to users.** Students should always know what the bot covers and what it doesn't. The scope pill in the UI ("MURP / UEPP") and the disclaimer footer are not cosmetic — they set appropriate expectations and reduce trust damage when the bot can't help.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│              User Interface                  │
│         (React artifact / Next.js)           │
└──────────────────┬──────────────────────────┘
                   │ user query
┌──────────────────▼──────────────────────────┐
│              Chat Layer                      │
│    System prompt + conversation history      │
│    Calls getContext(query) only              │
│    Never imports raw documents               │
└──────────────────┬──────────────────────────┘
                   │ getContext(query)
                   │ → { text, sources }
┌──────────────────▼──────────────────────────┐
│           Knowledge Layer                    │
│  Phase 1: hardcoded const string             │
│  Phase 3: vector DB retrieval (RAG)          │
│                                              │
│  Three tiers:                                │
│  Layer 1 — Staff routing (SPIA contact map) │
│  Layer 2 — MURP curriculum (spia.vt.edu)    │
│  Layer 3 — UAP 5174 syllabi (dual campus)   │
└─────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│           Anthropic API                      │
│    claude-sonnet-4-20250514                  │
│    max_tokens: 1000                          │
└─────────────────────────────────────────────┘
```

**Critical interface (do not change between phases):**
```javascript
getContext(query) → { text: string, sources: string[] }
```

---

## Knowledge Sources

| Layer | Content | Source | Last Updated |
|---|---|---|---|
| 1 — Staff Routing | SPIA staff contact map | Lucidspark JSON (parsed) | 2026-05-20 |
| 2 — Program | MURP curriculum, faculty, tuition | spia.vt.edu/academics/graduate/murp | 2026-05-20 |
| 2b — Electives | Cross-dept elective course catalog (69 courses, 9 depts) | Course_Tracking.xlsx | Spring 2026 |
| 3 — Course (BKB) | UAP 5174 Bieri syllabus | UAP5174_PlanningTheory_S26.pdf | Spring 2026 |
| 3 — Course (ARL) | UAP 5174 Cowell syllabus | Cowell_Planning_Theory_Spring_2024.pdf | Spring 2024 |

**Layer 2b data quality issues (resolve before Phase 3 ingestion):**
- GEOG 5314 listed twice with completely different titles — confirm with Geography dept
- NR 5884 listed twice with different courses — confirm correct course numbers with NR dept
- 3 NR courses have TBD codes — track when numbers are assigned
- 7 courses with no campus listed (all inactive 3+ years)

---

## Phase Roadmap

| Phase | Description | Status |
|---|---|---|
| 1 | React artifact prototype, hardcoded knowledge | ✅ Complete (render fix pending) |
| 2 | Hosted Next.js app on Vercel, shareable URL | ⬜ Next |
| 3 | RAG pipeline (Chroma/pgvector), document ingestion | ⬜ Planned |
| 4 | Department-wide scope, VT CAS authentication | ⬜ Planned |
| 5 | Production hardening, logging, governance | ⬜ Planned |

---

## Known Issues and Ambiguities

| # | Issue | Status |
|---|---|---|
| 1 | Phase 1 combined bot widget render timeout (code size) | Open — fix before Phase 2 |
| 2 | Graduate Certificates: Kelly Crist vs Stephen Gilmore split unclear | Open — email Kelly Crist (see PROGRESS.md) |
| 3 | REAL 2004 scope decision | ✅ Resolved — excluded; separate bot if needed (ADR-011) |
| 4 | MPA/MPIA shallow vs deep coverage | ✅ Resolved — shallow through Phase 2; MPIA first in Phase 3 (ADR-012) |
| 5 | Arlington UAP 5174 AI policy: Cowell 2024 has none | Flag to students; update if Cowell issues 2025/26 policy |
| 6 | Staff contact governance | ✅ Resolved — Kelly Crist as content owner; David as technical owner; semester-start review cadence (see PROGRESS.md) |

---

## Development Environment

**Design and documentation:** claude.ai Project (this project)
**Implementation (Phase 2+):** Claude Code Desktop App or CLI
**Version control:** GitHub — `spia-murp-advisor` (private repo)
**Deployment:** Vercel, linked to GitHub — push to `main` triggers automatic redeploy

**Sync discipline:** README.md, DECISIONS.md, and PROGRESS.md exist in both GitHub (canonical) and this Claude Project (reference snapshot). After any Claude Code session that materially updates these files, re-upload to this Claude Project to keep design-layer context current.

**Claude Code session startup protocol:**
1. CLAUDE.md loads automatically
2. Read `README.md` (project state)
3. Read `PROGRESS.md` (current task)
4. Read `DECISIONS.md` only if facing an architecture question
5. Proceed with implementation

**Commit message convention:**
- `feat:` new feature · `fix:` bug fix · `docs:` documentation
- `content:` knowledge layer updates (content/ or lib/knowledge.ts)
- `chore:` config, dependencies

---

## File Structure (Phase 2 — target)

```
spia-murp-advisor/
├── CLAUDE.md                  ← Claude Code session context (auto-loaded)
├── README.md                  ← this file
├── DECISIONS.md               ← architecture decisions (13 ADRs)
├── PROGRESS.md                ← implementation checklist
├── .env.local                 ← ANTHROPIC_API_KEY (never commit — in .gitignore)
├── .gitignore
├── package.json
├── next.config.ts
├── content/                   ← plain markdown knowledge sources (committed to repo)
│   ├── murp_curriculum.md     ← Layer 2: program structure, faculty, tuition
│   ├── spia_staff_contacts.md ← Layer 1: staff routing table
│   ├── murp_electives.md      ← Layer 2b: curated elective catalog and caveats
│   ├── uap5174_bieri_s26.md   ← Layer 3: Blacksburg syllabus
│   └── uap5174_cowell_s24.md  ← Layer 3: Arlington syllabus
├── app/
│   ├── page.tsx               ← main chat UI
│   ├── api/
│   │   └── chat/
│   │       └── route.ts       ← server-side API handler (API key stays here)
│   └── components/
│       ├── ChatWindow.tsx
│       ├── Sidebar.tsx
│       └── Message.tsx
└── lib/
    ├── knowledge.ts           ← getContext() — assembles content/ files (Phase 1/2 stub)
    └── systemPrompt.ts        ← system prompt assembly
```

**Note on content/ vs lib/knowledge.ts:** Content updates (new syllabus, staff change) are edits to plain markdown in `content/` — no TypeScript required. `lib/knowledge.ts` is an assembler, not a content store. In Phase 3, the RAG ingestion pipeline reads `content/` directly — no migration needed.

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
=======
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
>>>>>>> claude/spia-murp-advisor-setup-N8EVH

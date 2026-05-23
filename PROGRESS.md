# Jane (SPIA MURP Advisor Bot) — Implementation Progress

**Current phase:** Phase 2 complete → Phase 3 beginning
**Last updated:** 2026-05-23

---

## Phase 1 — Working Prototype ✅ Complete
*Goal: React artifact with clean two-layer architecture and full knowledge base*

All Phase 1 items complete. See previous PROGRESS versions for full checklist.
Prototype remains available for demo purposes.

---

## Phase 2 — Hosted Web Application ✅ Largely Complete
*Goal: Next.js app on Vercel with shareable URL*

### Infrastructure
- [x] GitHub repo created (`spia-murp-advisor`, private)
- [x] Next.js scaffold with App Router
- [x] Vercel deployment — auto-deploys on push to `main`
- [x] API key in environment variable only (never client-side)

### Identity — "Jane"
- [x] Bot renamed to **Jane** throughout (page title, sidebar, aria labels, escalation copy)
- [x] System prompt rewritten: identity, scope, campus disambiguation, escalation,
      confidence, Jacobs, Moses, pearls, tone, what Jane does not do
- [x] Model updated to `claude-sonnet-4-6`
- [x] Opening message pre-populated as first assistant turn in messages state

### Personality and Knowledge Layers
- [x] `jacobs_concepts.md` — synthesised Jane Jacobs knowledge base (ideas, not reproduced text)
- [x] `planning_pearls.md` — 30 planning wisdom pearls across 8 thematic clusters
- [x] Jane Jacobs integration in system prompt (one reference per response, not a lecture)
- [x] Robert Moses humor in system prompt (dry, only for design/theory topics)
- [x] Planning pearls in system prompt (one in four/five responses, never for logistics)

### UI
- [x] Sidebar: Campus toggle (Blacksburg / Arlington)
- [x] Sidebar: Topic tabs restructured — two rows:
      Row 1: `Program | Admin`
      Row 2: `Core | Electives | Certificates`
      (Replaces single `UAP 5174` tab)
- [x] `StarterPrompts.tsx` component — 6 clickable chips below opening message
- [x] Campus nudge banner updated for "core" topic (was "uap5174")
- [x] Escalation text updated to Jane's voice
- [x] `scopeLabel()` updated for all five topics
- [x] VT branding throughout (maroon #861F41, orange #E5751F)

### Knowledge Base — Original 11 Files
- [x] `spia_staff_contacts.md`
- [x] `murp_curriculum.md`, `murp_electives.md`, `murp_faqs.md`
- [x] `murp_4plus1.md`, `murp_certificates_detail.md`, `murp_course_sequence.md`
- [x] `murp_faculty_research.md`, `murp_student_life.md`
- [x] `uap5174_bieri_s26.md` (Blacksburg), `uap5174_cowell_s24.md` (Arlington)

### Knowledge Base — Syllabi Pipeline
- [x] `syllabi_to_kb.py` — PDF-to-markdown extraction pipeline
      Handles: syllabi, MURP theses, rubric documents
      Extracts: campus, modality, instructor, term, policies, advising notes
      Detects: Blacksburg vs Arlington/NCR (filename + content + location clues)
      Detects: In-Person / Hybrid / Online modality
      Skip logic: CSV-log-based (reliable for multi-syllabus course folders)
      Filename: `{course}_{campus}_{modality_if_nondefault}_{instructor}_{term}.md`
- [x] Full UAP, GIA, SPIA course KB generated from syllabi folder
- [x] MURP thesis KB generated — research scope, methods, curriculum connections
- [x] Thesis rubric extracted (`murp_rubric_*.md`)
- [x] Multi-instructor / multi-campus course variants handled as distinct files

### Tested and Working
- [x] Admissions → Tyler Wiltshire ✅
- [x] Assistantship → Kelly Crist ✅
- [x] Arlington admin → Elia Amegashie ✅
- [x] Travel reimbursement → Shelley Adkins ✅
- [x] UAP 5174 campus disambiguation triggered ✅
- [x] Vercel deployment clean (no TypeScript errors) ✅

### Remaining Phase 2 Items (before student exposure)
- [ ] **Feedback backend** — Vercel KV logging for thumbs-up/down
      *(deferred from Phase 2 colleague share; required before student exposure)*
- [ ] **Word count / token audit** — `Get-ChildItem src\content -Filter *.md | Get-Content | Measure-Object -Word`
      Run before committing full KB; result determines whether topic-based filtering
      is needed before or after colleague share (threshold: ~90K words)
- [ ] Remaining browser tests: NR elective OMNR caveat, late policy disambiguation,
      out-of-scope redirect, AI policy question
- [ ] Share with Todd Schenk and Dara Wald (colleague share)

---

## Phase 3 — Knowledge Base Expansion and Performance
*Goal: Complete knowledge base, topic-based context filtering, MPIA expansion*

### Immediate Post-Colleague-Share (in order)
- [ ] **Feedback backend** (Vercel KV) — required before student-facing deployment
- [ ] **Topic-based context filtering** — `lib/knowledge.ts` loads only files
      matching active topic (core / electives / certificates / program / admin)
      rather than all files. Cuts context 60–70% without retrieval complexity.
      *Trigger: if word count audit shows >90K words, do before colleague share*
- [ ] **File-level metadata tags** — add frontmatter to each `.md`:
      `topic`, `campus`, `course`, `modality` for granular filtering
- [ ] **Faculty research profiles** — `faculty_[lastname].md` per current faculty member
      covering research interests, advising availability, methodological strengths.
      Source: spia.vt.edu/faculty or manual write. Critical gap for thesis advising.
- [ ] **Program-level documents** — `murp_degree_requirements.md`,
      `murp_graduation_checklist.md`, `murp_admissions.md`, `murp_funding.md`
- [ ] Update `QUICK_QUESTIONS` in `Sidebar.tsx` once full course KB is reviewed
      (current entries are generic stubs; replace with actual course names/numbers)

### Program Expansion (Phase 3 proper)
- [ ] **MPIA** — first expansion priority (enrollment risk + CIP misclassification;
      frame content around IR identity, not urban studies; see ADR-012)
- [ ] CPAP PhD
- [ ] MPA
- [ ] PGG tracks

### Performance Optimization Sequence
1. Measure: word count audit (do now)
2. Topic-based filtering: after colleague share (or before, if >90K words)
3. File-level metadata filtering: Phase 3 midpoint
4. **RAG**: only when multi-program scope makes even filtered context too large,
   or when sub-document retrieval within long thesis files is needed.
   RAG introduces retrieval failure modes; defer until genuinely required.
   *Not before MPIA content is in and topic filtering is proven.*

### Source Display (Phase 3)
- [ ] Show which `.md` file(s) answered each query
      `sources` is already in `getContext()` return signature — populate it

---

## Phase 4 — Department-Wide Deployment
*Goal: VT CAS authentication, full program scope*

- [ ] VT IT engagement for CAS/SSO integration
- [ ] Implement OAuth/CAS authentication in Next.js
- [ ] Full SPIA program scope with metadata filtering
- [ ] Document ingestion governance (ownership, update cadence, review process)
- [ ] ASPECT PhD absorption context (if relevant by Phase 4)
- [ ] Consider move from Vercel to VT infrastructure for CAS compatibility

---

## Phase 5 — Production Hardening

- [ ] Query logging (anonymous — what questions are failing?)
- [ ] Automated testing suite for known queries
- [ ] Staff contact refresh automation or manual review cadence
- [ ] Syllabus ingestion trigger (start of each semester — re-run syllabi_to_kb.py)

---

## Blocked / Waiting

| Item | Blocked on | Owner |
|---|---|---|
| Feedback backend | Not blocking colleague share; required before student exposure | David |
| Word count audit | Run before copying full KB to repo | David |
| QUICK_QUESTIONS update | Review generated KB files to know actual course inventory | David |
| Faculty research profiles | Manual write or spia.vt.edu scrape | David |
| Kelly Crist cert split | Email not yet sent (Gilmore/Crist split) | David |
| GEOG 5314 duplicate | Confirm two courses with Geography dept | David |
| NR 5884 duplicate | Confirm course numbers with NR dept | David |

---

## Decisions Log Summary
*(Full records in DECISIONS.md)*

| # | Decision | Date |
|---|---|---|
| ADR-001 | Two-layer architecture (knowledge / chat separation) | 2026-05-20 |
| ADR-002 | Hardcoded stub as Phase 1 retrieval layer | 2026-05-20 |
| ADR-003 | Deep MURP only through Phase 2 | 2026-05-20 |
| ADR-004 | Three-tier knowledge hierarchy | 2026-05-20 |
| ADR-005 | Campus disambiguation — never merge Blacksburg/Arlington | 2026-05-20 |
| ADR-006 | Strangler Fig pattern | 2026-05-20 |
| ADR-007 | Dev environment split (WSL/Windows) | 2026-05-20 |
| ADR-008 | Staff routing as distinct layer | 2026-05-20 |
| ADR-009 | React artifact → Next.js | 2026-05-20 |
| ADR-010 | getContext() interface as phase boundary | 2026-05-20 |
| ADR-011 | REAL 2004 excluded (grad-only scope) | 2026-05-20 |
| ADR-012 | MPIA shallow Phase 2; MPIA first in Phase 3 | 2026-05-20 |
| ADR-013 | Elective catalog as Layer 2b | 2026-05-20 |
| ADR-014 | Jane persona — Jacobs namesake, Moses humor, planning pearls | 2026-05-23 |
| ADR-015 | Syllabi-to-KB pipeline (syllabi_to_kb.py) | 2026-05-23 |
| ADR-016 | Topic sidebar restructure (core / electives / certificates) | 2026-05-23 |
| ADR-017 | Performance optimization sequence (measure → filter → RAG) | 2026-05-23 |
| ADR-018 | Opening message as pre-populated assistant turn | 2026-05-23 |

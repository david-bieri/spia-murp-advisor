# Jane — Progress Tracker

---

## Current status

**Phase 2 complete. Phase 3 in progress on `develop` branch.**

- Live URL: spia-murp-advisor.vercel.app (main = e841dc5)
- Develop branch: created off e841dc5 for Phase 3 work
- Colleague share: pending Phase 2 completion items below

---

## Phase 2 checklist

### Infrastructure ✅
- [x] Next.js App Router project initialised
- [x] Vercel deployment linked to GitHub main
- [x] `ANTHROPIC_API_KEY` in `.env.local`, gitignored
- [x] TypeScript + Tailwind CSS v4 configured
- [x] Acherus Grotesque self-hosted fonts
- [x] Crimson Text + DM Mono via Google Fonts
- [x] VT favicon.ico

### UI/UX ✅
- [x] Chat interface with user + assistant bubbles
- [x] VT maroon/orange colour scheme
- [x] J avatar (maroon circle)
- [x] Five-topic sidebar (Program / Admin / Core / Electives / Certs)
- [x] Campus toggle (Blacksburg / Arlington)
- [x] Starter prompts — 7 chips, rounded-full, disappear after first message
- [x] Opening message as pre-populated assistant turn (clientOnly: true)
- [x] Mobile viewport fix (h-dvh, iOS safe area)
- [x] 3-icon feedback bar (👍 👎 📋 — thumbs-up, thumbs-down, copy)
- [x] Thumbs-down escalation (clientOnly message → Todd Schenk / Prof. Bieri)
- [x] Contextual nudges (amber campus, blue admin, green fresh-chat)
- [x] Markdown rendering (react-markdown + remark-gfm v3)

### Knowledge base ✅
- [x] spia_staff_contacts.md
- [x] murp_curriculum.md
- [x] murp_electives.md
- [x] murp_faqs.md
- [x] murp_4plus1.md
- [x] murp_certificates_detail.md
- [x] murp_course_sequence.md
- [x] murp_faculty_research.md
- [x] murp_student_life.md
- [x] jacobs_concepts.md
- [x] planning_pearls.md
- [x] UAP 5174 Blacksburg + Arlington syllabi KB
- [x] Full course KB from syllabi_to_kb.py pipeline
- [x] Thesis KB files (thesis_*.md)
- [x] Rubric KB files (murp_rubric_*.md)

### Jane's personality ✅
- [x] Jane Jacobs namesake + references
- [x] Robert Moses dry humour (design topics only)
- [x] Planning pearls (1 in 4–5 responses)
- [x] One register shift per response rule
- [x] Escalation routing to real staff

### Testing ✅
- [x] Playwright test suite: 33 tests, all mocked, 33/0
- [x] check_repo.ps1: 69 checks, 0 failures
- [x] pre_deploy_check.py: all categories pass
- [x] Mobile viewport testing (iOS Safari, Chrome Android)

### Phase 2 completion items — PENDING (ship on `main`)
- [ ] Feedback backend (`/api/feedback` route + wire thumbs-up/down stubs)
- [ ] 4 remaining browser tests:
  - [ ] NR elective OMNR prefix disambiguation
  - [ ] Late policy disambiguation across instructors
  - [ ] Out-of-scope redirect (non-MURP question)
  - [ ] AI policy question handling

### Colleague share — PENDING (after above)
- [ ] Share spia-murp-advisor.vercel.app with Todd Schenk (tschenk@vt.edu)
- [ ] Share with Dara Wald
- [ ] Distribute Jane_Testing_Protocol_Casual.md

---

## Phase 3 checklist

### Pre-conditions
- [ ] git reset --hard origin/main (sync local to e841dc5)
- [ ] git checkout -b develop && git push -u origin develop
- [ ] Verify `topic` in POST body in page.tsx → route.ts
- [ ] Word count audit (target <90K words before new KB)
- [ ] Confirm remark-gfm in package.json

### Sprint 1 — New KB files (`develop`, Days 1–2)
- [ ] src/content/murp_prerequisites.md
- [ ] src/content/murp_sample_paths.md
- [ ] src/content/murp_deadlines.md
- [ ] src/content/murp_funding.md
- [ ] DECISIONS.md: add ADR-022, ADR-023, ADR-024

### Sprint 2 — Hook + knowledge layer (`develop`, Days 3–4)
- [ ] src/hooks/useAcademicAdvisor.ts (types + metrics; no moveCourse)
- [ ] src/lib/knowledge.ts: extend getContext(query, topic?)
  - [ ] Add intent-detection regexes (8 patterns)
  - [ ] Add supplementary file loading (exists-check before include)
  - [ ] Preserve { text, sources } return type (ADR-001/010)
- [ ] Populate `sources` field in getContext() return — surface which .md file(s)
      answered each query (signature already supports it; implementation pending)

### Sprint 3 — Streaming + structured output (`develop`, Days 5–9)
- [ ] src/lib/useStreamingChat.ts
  - [ ] isStructuredPending detection (trimStart check)
  - [ ] __BUILDING_PLAN__ placeholder state
- [ ] src/components/StreamingCursor.tsx
- [ ] src/app/globals.css: jane-blink + course chip classes
- [ ] src/app/api/chat/route.ts
  - [ ] Streaming (TransformStream bridge)
  - [ ] Model string: claude-sonnet-4-6
  - [ ] detectModeAddendum(query, history) → plan + audit JSON schemas
  - [ ] Campus hint in system prompt
- [ ] src/hooks/useAcademicAdvisor.ts: add moveCourse stub (Phase 4)
- [ ] src/components/DegreePlanCard.tsx (shell: renders DesktopGrid or MobileTabs)
- [ ] src/components/DesktopGrid.tsx (adopted from architecture doc, revised)
- [ ] src/components/MobileTabs.tsx (tabbed semester view, <640px)
- [ ] src/components/DegreeAuditCard.tsx
- [ ] src/components/Message.tsx (JSON detection + __BUILDING_PLAN__ handling)
- [ ] src/components/StarterPrompts.tsx (10 chips: 7 existing + 3 new)
- [ ] Cold-start timeout test: degree map plan generation on Vercel preview

### Sprint 4 — Conversational features + tests (`develop`, Days 10–13)
- [ ] src/components/StructuredCards.tsx (ThesisTopicCard + FundingCard)
- [ ] Message.tsx: add thesis/funding type guards
- [ ] Playwright: add degree map tests
- [ ] Playwright: add audit tests
- [ ] Playwright: add conflict checker test
- [ ] Update check_repo.ps1 expected test count

### Merge to main
- [ ] All Sprint 3 Playwright tests pass
- [ ] Colleague feedback received on stable main features
- [ ] Vercel preview URL tested on mobile (iOS Safari)
- [ ] `git checkout main && git merge develop && git push`

---

## Performance optimization sequence

The sequence below is intentional — do not skip ahead to RAG.

1. **Measure** — word count audit now: `Get-ChildItem src\content -Filter *.md | Get-Content | Measure-Object -Word`. Target: <90K words.
2. **Topic-based filtering** (Sprint 2) — `getContext(query, topic?)` loads only files matching the active topic. Cuts context 60–70% without retrieval complexity.
3. **File-level metadata filtering** (Phase 3 midpoint) — frontmatter tags (`topic`, `campus`, `course`, `modality`) enable granular per-file filtering.
4. **RAG** (Phase 4 only, if needed) — deferred until multi-program scope makes even filtered context too large, or sub-document retrieval within long thesis files becomes necessary. RAG introduces retrieval failure modes that are not justified until topic filtering is proven insufficient.

---

## Phase 4 queue (not in scope for Phase 3)

- `moveCourse` drag-and-drop (needs @dnd-kit/core)
- PDF export for degree plan (@react-pdf/renderer)
- Feedback persistence (Vercel KV) — before wider student exposure
- Faculty research profiles in murp_faculty_research.md (fill real names)
- MPIA content expansion (CIP 45.0901 context — see ADR-012)
- ASPECT PhD absorption (CLAHS 2030 closure; ~33 doctoral students)
- VT CAS authentication (Phase 5)
- Vercel Pro upgrade ($20/mo — lifts 10s timeout, enables proper streaming)

---

## Blocked / watch items

| Item | Status | Resolution |
|---|---|---|
| Vercel Hobby 10s timeout | Watch | Test plan generation cold start; upgrade to Pro if >8s |
| Playwright count in check_repo.ps1 | Action needed | Update after each Sprint adding tests |
| remark-gfm v3 pipe tables (ADR-020 superseded) | Write ADR-022 | Remove no-tables rule from system-prompt.ts |
| GEOG 5314 listed twice, different titles | Unresolved | Confirm correct course with Geography dept before Phase 3 KB ingestion |
| NR 5884 listed twice, different courses | Unresolved | Confirm course numbers with NR dept before Phase 3 KB ingestion |
| Kelly Crist cert split | Email not sent | Clarify Gilmore/Crist responsibility split for certificate programs |

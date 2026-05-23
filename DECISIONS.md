# SPIA Bot — Architecture Decision Records (ADRs)

Each record documents a significant decision: what was decided, why, what alternatives were rejected, and what consequences follow. Update status as decisions evolve.

Statuses: `Accepted` | `Superseded` | `Deprecated` | `Proposed`

---

## ADR-001: Two-Layer Architecture (Knowledge / Chat Separation)

**Date:** 2026-05-20
**Status:** Accepted

**Decision:**
Maintain a strict separation between the knowledge retrieval layer and the chat/API logic layer. These are distinct modules with a defined interface between them.

**Interface contract:**
```javascript
getContext(query) → { text: string, sources: string[] }
```
The chat layer calls `getContext()` and nothing else. It never imports raw document content directly.

**Rationale:**
This is the single most important architectural decision in the project. If the knowledge and chat layers are coupled, swapping from a hardcoded stub (Phase 1) to a RAG pipeline (Phase 3) requires rewriting the application. With clean separation, only `getContext()` changes — the chat layer is untouched.

**Alternatives considered:**
- Single-file implementation: rejected — couples concerns, forces rewrite at Phase 3
- Full RAG from day one: rejected — over-engineering for prototype scale, premature infrastructure

**Consequences:**
- All knowledge updates touch only the retrieval layer
- Phase 1 → Phase 3 upgrade is a localized swap, not a structural rewrite
- Testing the chat layer and testing the knowledge layer can be done independently

---

## ADR-002: Hardcoded Knowledge Stub as Phase 1 Retrieval Layer

**Date:** 2026-05-20
**Status:** Accepted

**Decision:**
In Phase 1, implement `getContext()` as a constant string containing structured plain text. No database, no embeddings, no external calls.

**Rationale:**
The Strangler Fig pattern: the prototype is not throwaway — it is the final system's skeleton with a simple retrieval implementation. The stub is replaced, not rebuilt. Hardcoded text works up to ~50–60 pages of content, which is sufficient for Phase 1 scope.

**Limits of this approach:**
Token budget becomes expensive at >3 additional courses. Answer precision degrades on specific sub-topics vs. RAG. No automatic refresh when documents change.

**Trigger conditions for Phase 3 (RAG) upgrade:**
- >2–3 additional courses added to scope
- Answer quality degradation on specific topics observed in testing
- Need for automatic document refresh without manual edits

**Consequences:**
- Phase 1 can be built and iterated without any infrastructure
- Knowledge updates require manual edits to the const and a redeploy
- Context window size constrains total knowledge volume

---

## ADR-003: Scope — Option B (Deep MURP/UEPP, Not Shallow All-Programs)

**Date:** 2026-05-20
**Status:** Accepted

**Decision:**
Phase 1 knowledge layer goes deep on MURP/UEPP only. Other SPIA programs (MPA, MPIA, PGG, CPAP, PUA) are covered only at the routing level (who to contact), not at curriculum depth.

**Rationale:**
A shallow-but-broad bot that gets details wrong is worse than a deep-but-narrow bot that is reliably accurate. MURP is the primary audience and the program where detailed questions arise. Staff contact routing covers the immediate needs of other program students without requiring full curriculum coverage.

**Alternatives considered:**
- Option A (shallow all programs): rejected — accuracy risk, high maintenance burden
- Option C (both, with scope tagging): deferred to Phase 3 when metadata filtering in RAG makes this tractable

**Scope boundaries:**
- In scope: MURP curriculum, UEPP faculty, UAP 5174 (both campuses), SPIA staff contacts
- Out of scope (Phase 1): MPA curriculum detail, MPIA curriculum detail, PGG curriculum detail, CPAP curriculum detail, financial aid decisions, individual plan-of-study advice, grade disputes

**Consequences:**
- Bot reliably answers MURP questions rather than unreliably answering all SPIA questions
- Students from other programs are routed to the correct contact rather than given incomplete answers
- Phase 3 expansion adds programs incrementally with metadata tagging

---

## ADR-004: Three-Tier Knowledge Hierarchy

**Date:** 2026-05-20
**Status:** Accepted

**Decision:**
Structure the knowledge layer in three explicit tiers with different authority levels and routing behavior:

- **Tier 1 (Course-level):** Specific course policies — syllabi, deadlines, grading, office hours. Bot answers directly and authoritatively.
- **Tier 2 (Program-level):** MURP curriculum structure, concentrations, certificates, capstone options, campus differences. Bot answers directly and authoritatively.
- **Tier 3 (School-level):** All SPIA programs in summary, staff contacts, application deadlines, tuition. Bot answers summary questions and routes to contacts for decisions.

**Rationale:**
Not all knowledge warrants the same confidence level or the same response behavior. Tier 1 answers should be precise; Tier 3 answers should route rather than opine. Encoding this distinction in the knowledge structure prevents the bot from being overconfident on matters requiring human judgment.

**Consequences:**
- System prompt must encode routing behavior by tier
- In Phase 3 RAG, tiers become metadata tags for retrieval filtering
- Scope boundaries are explicit and auditable

---

## ADR-005: Campus Disambiguation — Never Merge Blacksburg and Arlington Policies

**Date:** 2026-05-20
**Status:** Accepted

**Decision:**
For any UAP 5174 policy that differs between campuses, the bot must always present both versions clearly labeled `[Blacksburg — Bieri]` and `[Arlington — Cowell]`, or ask which campus the student is on. Merging or averaging policies across campuses is explicitly prohibited in the system prompt.

**Rationale:**
The two sections differ substantially across 12 documented dimensions (reflection weight, due day, length, visibility, late policy, required texts, AI policy, office hours, format, individual assignments, ethics grade, project weight). A merged answer would be wrong for both students.

**Known policy differences (as of May 2026):**
1. Reflection due: Fri 5pm (BKB) vs Mon noon (ARL)
2. Reflection length: ~400 words (BKB) vs ~500 words (ARL)
3. Reflection visibility: private Canvas (BKB) vs public forum (ARL)
4. Reflection weight: 40% (BKB) vs 30% (ARL)
5. Individual assignments: none (BKB) vs 2 papers (ARL)
6. Ethics grade: embedded (BKB) vs explicit 5% (ARL)
7. Late penalty: zero credit (BKB) vs −1 grade/day (ARL)
8. Jacobs: separate purchase (BKB) vs included in FD (ARL)
9. AI policy: detailed (BKB) vs absent in 2024 (ARL)
10. Office hours: fixed M/W 4–5pm (BKB) vs by appointment (ARL)
11. Class format: in-person M/W daytime (BKB) vs hybrid Mon evenings (ARL)
12. Project weight: 30% (BKB) vs 25% (ARL)

**Consequences:**
- System prompt must hard-code the disambiguation rule
- Campus toggle in UI sends a context hint to the API
- Adding a third section instructor requires extending this pattern, not replacing it

---

## ADR-006: Strangler Fig Pattern — Prototype Is the System Skeleton

**Date:** 2026-05-20
**Status:** Accepted

**Decision:**
This project does not build a throwaway prototype followed by a real system. The Phase 1 artifact is the final system's skeleton with simple internals. Each phase replaces internals without changing the skeleton.

**Rationale:**
Throwaway prototypes waste work and create false confidence. The Strangler Fig approach ensures every phase produces something deployable and every upgrade is incremental. The risk of structural rewrite is eliminated if ADR-001 (clean separation) is maintained.

**Phase mapping:**
- Phase 1: skeleton + hardcoded knowledge stub
- Phase 2: skeleton moves to hosted app + same stub
- Phase 3: stub replaced by RAG retrieval — skeleton unchanged
- Phase 4: RAG scope expanded — retrieval layer extended, skeleton unchanged

**Consequences:**
- Phase 1 must be built with final-system discipline, not prototype discipline
- Shortcuts that couple layers are unacceptable even in Phase 1
- Each phase is independently deployable and testable

---

## ADR-007: Development Environment Split

**Date:** 2026-05-20
**Status:** Accepted

**Decision:**
Use two distinct environments for two distinct phases of work:
- **claude.ai Project** — design decisions, documentation, architecture discussion, prototyping, generating these files
- **Claude Code (CLI)** — Phase 2+ implementation, filesystem operations, package management, local dev server, deployment

Codex (OpenAI) considered and rejected: no technical advantage over Claude Code, introduces ecosystem fragmentation.

**Rationale:**
The two environments serve genuinely different purposes. claude.ai Project excels at conversational design iteration and persistent document context. Claude Code excels at agentic execution with filesystem access. Using one for the other's job produces friction.

**Handoff protocol:**
The three markdown files (`README.md`, `DECISIONS.md`, `PROGRESS.md`) are the bridge. Claude Code reads them at session start for full project context. Updates made in either environment are reflected in the files.

**Consequences:**
- Design decisions made here must be committed to `DECISIONS.md` before handing off to Claude Code
- Claude Code sessions start with: read `README.md` → read `PROGRESS.md` → proceed
- The files are the source of truth, not either environment's memory

---

## ADR-008: Staff Contact Routing as Distinct Knowledge Layer

**Date:** 2026-05-20
**Status:** Accepted

**Decision:**
Administrative staff contacts are encoded as a dedicated routing table (Layer 1) separate from program curriculum (Layer 2) and course policies (Layer 3). The routing rule is explicit: send students to staff for administrative matters; do not route administrative questions to faculty.

**Source:** SPIA Staff Contact Map (Lucidspark, parsed from JSON graph structure)

**Rationale:**
The most common failure mode in departmental bots is routing students to the wrong person — typically a faculty member who cannot resolve administrative issues. Explicit routing logic prevents this.

**Known ambiguity to resolve:**
Graduate Certificates appears connected to both Kelly Crist and Stephen Gilmore in the source map. Current behavior: route to Kelly Crist as primary; note Stephen Gilmore may handle communications/web aspects. Confirm with Kelly Crist before Phase 2 deployment.

**Consequences:**
- Staff layer must be updated whenever staff roles change (higher churn than curriculum)
- In Phase 3 RAG, staff routing nodes should be tagged for high retrieval priority on "who do I contact" queries
- Governance question: who owns staff contact updates?

---

## ADR-009: React Artifact for Phase 1, Next.js for Phase 2

**Date:** 2026-05-20
**Status:** Accepted

**Decision:**
Phase 1 is implemented as a React artifact within claude.ai — self-contained, no deployment required. Phase 2 moves to a Next.js application deployed on Vercel.

**Rationale:**
React artifact is the fastest path to a working prototype with zero infrastructure. Next.js is the right choice for Phase 2 because: (a) server-side API routes keep system prompt and API key out of the browser, (b) it is well-documented for VT CAS/OAuth integration in Phase 4, (c) Vercel deployment is one command.

**Phase 1 limitation hit in development:**
Widget code size caused streaming timeout in claude.ai renderer. Workaround: externalize knowledge string or compress prompt. Does not affect Phase 2 architecture.

**Consequences:**
- Phase 2 requires Node.js environment and Vercel account
- API key moves to environment variable in Phase 2 (never in client-side code)
- Phase 1 artifact remains available for demo and testing purposes

---

## ADR-010: getContext() Interface as the Phase Boundary

**Date:** 2026-05-20
**Status:** Accepted

**Decision:**
The function signature `getContext(query) → { text: string, sources: string[] }` is the explicit contract between the knowledge layer and the chat layer. This interface must not change between phases; only the implementation behind it changes.

**Phase implementations:**
- Phase 1: returns hardcoded const string; sources = []
- Phase 3: runs vector similarity search; returns retrieved chunks; sources = document references

**Consequences:**
- Chat layer tests written against this interface work across all phases
- Any change to this signature is a breaking change requiring coordination
- Sources array enables future citation display in the UI (Phase 3+)

---

## ADR-011: REAL 2004 Excluded — Graduate-Only Scope Through Phase 2

**Date:** 2026-05-20
**Status:** Accepted

**Decision:**
REAL 2004 (undergraduate real estate course) is excluded from the SPIA bot through Phase 2. The bot serves graduate students only. If REAL 2004 course support is needed, it should be implemented as a separate, standalone course bot rather than integrated into this one.

**Rationale:**
MURP graduate students and REAL 2004 undergraduates have fundamentally different needs, stakes, and question types. Mixing audiences in a single bot creates two problems: (1) system prompt dilution — the bot loses the tight scope discipline that makes it accurate for either audience; (2) precedent effect — adding one undergraduate course invites requests for others, making scope creep structural rather than occasional. A separate lightweight course bot for REAL 2004 serves undergraduates without contaminating the graduate bot's accuracy profile.

**Alternatives considered:**
- Single bot serving both audiences: rejected — audience fragmentation degrades accuracy for both
- Audience-filtered single bot: deferred — requires metadata filtering not available until Phase 3 RAG

**Consequences:**
- All Phase 2 testing and QA assumes a graduate student audience
- REAL 2004 support request, if it arises, is a new project ticket, not a scope extension
- The UAP 5174 widget pattern (Phase 1 v2) is the reusable template for any standalone course bot

---

## ADR-012: MPA/MPIA Shallow-Only Through Phase 2; MPIA Deep Coverage a Phase 3 Strategic Priority

**Date:** 2026-05-20
**Status:** Accepted

**Decision:**
MPA and MPIA curriculum depth is deferred to Phase 3. Through Phase 2, both programs are covered only at the routing level (who to contact, where to apply). MPIA deep coverage is explicitly flagged as a Phase 3 strategic priority — not merely a content expansion, but a student recruitment and program visibility instrument.

**Rationale — general:**
Curriculum depth requires accurate syllabi and program documentation from GIA (MPIA) and CPAP (MPA). Pursuing this before the bot has proven its value risks surfacing political friction prematurely. The staff routing layer already covers the immediate needs of MPA/MPIA students without requiring full curriculum knowledge.

**Rationale — MPIA specifically:**
MPIA's enrollment sits exactly at the SCHEV threshold of 22 students. Its CIP misclassification (currently 45.1201 Urban Studies, should be 45.0901 International Relations) actively suppresses prospective student discovery — students searching for IR programs do not find MPIA. A bot with deep MPIA coverage, correctly framed under IR, functions as a visibility and recruitment tool. This makes MPIA deep coverage a strategic investment, not just a content task.

**Trigger for Phase 3 MPIA prioritization:**
MPIA deep coverage should be the first program expansion in Phase 3, ahead of MPA or PGG, precisely because of the enrollment risk and CIP misclassification context.

**Alternatives considered:**
- Deep MPA/MPIA in Phase 2: rejected — requires documentation from programs with cross-program resistance; premature before bot credibility is established
- Indefinite shallow coverage: rejected — MPIA enrollment risk makes this strategically costly

**Consequences:**
- Phase 2 knowledge layer is unchanged from Phase 1 for MPA/MPIA
- Phase 3 scope expansion order: MPIA first, then MPA, then PGG/CPAP
- MPIA deep coverage work should be coordinated with CIP code correction effort (separate track)

---

## ADR-013: Cross-Departmental Elective Catalog as Layer 2b

**Date:** 2026-05-20
**Status:** Accepted

**Decision:**
The departmental course tracking spreadsheet (Course_Tracking.xlsx) constitutes a new knowledge sub-layer — Layer 2b (MURP Elective Course Ecosystem) — sitting within the existing Layer 2 (Program). It is integrated in two stages: a curated stub in Phase 1/2 and full RAG ingestion in Phase 3.

**What the dataset is:**
69 cross-departmental courses from 9 departments (ALS, ARCH, CEE, GEOG, GIA, LAR, NR, PAPA, SPIA) that MURP students may take to fulfill their 24-credit elective requirement. Fields include: course code, title, department, description, last offered, main campus, modality, notes, and last confirmed date.

**Phase 1/2 — Curated stub (add now):**
The following content is too important to wait for Phase 3:
- Natural Resources enrollment caveat (OMNR not XMNR; campus override may be needed — contact MNR dept)
- NR certificate note: Relevant certificates include Natural Resources, Watershed Management, Environmental GIS
- Top 4–5 courses per concentration area mapped to course codes
- Key scheduling notes: NR 5014 moves to Summer III only after Spring 2026; NR 5114 Spring has study abroad (take fall/summer instead); CEE 5204 professor retiring; CEE 5600/5654 recommended math background
- 7 stale courses flagged (not offered in 3+ years) — bot notes uncertain availability
- Upcoming courses: CEE 5644/5784/5854 (new); 3 TBD NR courses (coming soon)

**Phase 3 — Full RAG ingestion:**
All 69 courses ingested as individual chunks. Metadata schema per course:
- `department` — source department
- `campus` — Blacksburg / Online / NCR
- `modality` — In-Person / Online / Asynchronous / Hybrid
- `last_offered` — for staleness filtering
- `concentration_area` — manually tagged (Transportation / Environmental / Analytics / International / etc.)
- `has_prereq` — boolean, for prerequisite filtering
This enables filtered retrieval: "What online courses support the environmental concentration?"

**Data quality issues requiring resolution before Phase 3 ingestion:**
1. GEOG 5314 appears twice with completely different titles (Water Resources Ethics vs Spatial Analysis GIS) — likely two different courses with a shared number mis-entered; confirm with Geography department
2. NR 5884 appears twice with different titles (Data Visualization vs Environmental Conflict Resolution) — almost certainly two different course numbers; confirm with Natural Resources
3. Three upcoming NR courses have TBD codes — track when course numbers are assigned
4. Seven courses have no campus listed (all "not offered in 3+ years") — low priority but flag as uncertain availability in bot responses

**Concentration → course mapping (Phase 1/2 curated stub):**
- Transportation: CEE 5600, CEE 5654, CEE 5644 (new), CEE 5784 (new Spring 2027), CEE 5854 (new Fall 2026)
- Environmental Policy/Planning: NR 5014, NR 5174, NR 5524, NR 5525, NR 5544, NR 5694
- Planning Analytics / GIS: GEOG 5064, GEOG 5084G, GEOG 5245G, GEOG 5304G, CEE 5204
- International Development: GIA 5584 (Environmental Politics); GIA 5354 and 5434 not offered in 3+ years
- Urban Design: ARCH 5614, ARCH 5624, ARCH 5644, LAR 5044, LAR 5254
- Housing, Community & Economic Development: PAPA 5784, SPIA 5534, SPIA 5544, SPIA 5574
- Watershed / Environmental certificate track: NR 5204, NR 5264, NR 5274, NR 5724

**Consequences:**
- Layer 2b is a new section in the knowledge const (Phase 1/2) and a new document collection in the vector store (Phase 3)
- Concentration → course mapping must be manually maintained as courses rotate on/off
- Natural Resources enrollment caveat is operational information — Kelly Crist should confirm it remains accurate each semester
- Data quality fixes (GEOG 5314 and NR 5884 duplicates) should be resolved in the source spreadsheet before Phase 3 ingestion

---

## ADR-014: Jane Persona — Jacobs Namesake, Moses Humor, Planning Pearls

**Date:** 2026-05-23
**Status:** Accepted

**Decision:**
The bot is named Jane, after Jane Jacobs. Her personality has three active layers:
(1) Jacobs knowledge — weaves ideas from *Death and Life of Great American Cities*
naturally into advising responses; (2) Robert Moses humor — dry, collegial, reserved
for design and theory discussions only; (3) planning pearls — brief unsolicited
observations from planning practice, roughly one in four or five responses.

**Rationale:**
A purely functional advising bot is forgettable. A named character with a point of view
is memorable and more likely to be shared with peers. The Jacobs framing is substantively
relevant — her ideas about mixed use, campus disambiguation, eyes on the street, and
organised complexity are directly applicable to MURP curriculum content. Moses functions
as the foil that makes the Jacobs framing legible without explanation to anyone who has
studied planning history. The pearls layer adds professional depth without tipping into
the bot lecturing students.

**Constraints:**
- One register shift per response (Jacobs reference OR Moses joke OR pearl — not multiple)
- No humor on admissions, funding, thesis stress, or anything emotionally weighted
- Jacobs and the handbook never contradict each other — handbook always governs
- Jacobs knowledge implemented as synthesised concepts file (`jacobs_concepts.md`),
  not by reproducing copyrighted text

**Alternatives considered:**
- Generic persona: rejected — no differentiation, no memorability
- Full book ingestion: rejected — copyright constraint; synthesised concepts file
  achieves the same effect for advising purposes

---

## ADR-015: Syllabi-to-KB Pipeline (syllabi_to_kb.py)

**Date:** 2026-05-23
**Status:** Accepted

**Decision:**
A Python script (`dev/syllabi_to_kb.py`) converts PDF syllabi, MURP theses, and rubric
documents to structured markdown KB files using the Anthropic API. Document type detection
(syllabus / thesis / rubric) is automatic. Output filenames encode course, campus,
modality, instructor, and term.

**Rationale:**
Manual KB authoring does not scale to 60+ course syllabi across three programs and two
campuses. The pipeline makes KB refresh a one-command operation at semester start.
Thesis files give Jane research precedents for advising on thesis scope, methods, and
faculty matching — content that cannot be derived from syllabi alone.

**Key design decisions within the pipeline:**
- Folder name (not PDF filename) identifies the course — syllabi filenames are inconsistent
- Campus detected from document content first, PDF filename second
- NCR and Arlington normalised to the same slug (`arlington`)
- Modality slug (`hybrid`, `online`) in filename only for non-default cases
- Skip logic uses CSV log (exact source path match) — reliable for multi-syllabus folders
- Rubric files detected by `"rubric" in filename` — separate prompt, stable output filename
- Three extraction prompts: SYLLABUS_PROMPT, THESIS_PROMPT, RUBRIC_PROMPT

**Consequences:**
- KB refresh = re-run pipeline + copy output + git push
- Scanned PDFs require OCR pre-processing (ocr_batch.py) before pipeline
- `dev/syllabi_to_kb.py` is a project dependency — keep in repo, not ad-hoc

---

## ADR-016: Topic Sidebar Restructure

**Date:** 2026-05-23
**Status:** Accepted

**Decision:**
Topic tabs restructured from three (`Program | UAP 5174 | Admin`) to five in two rows:
- Row 1: `Program | Admin`
- Row 2: `Core | Electives | Certificates`

**Rationale:**
`UAP 5174` as a tab was a Phase 1 artifact when that was the only course in the KB.
With 60+ courses available, the three new content tabs correspond to the actual structure
of MURP curriculum decisions. Two rows prevents cramping in the 320px sidebar.

**Consequences:**
- `Topic` type: `"uap5174"` removed; `"core" | "electives" | "certificates"` added
- `scopeLabel()` updated; campus nudge fires on `topic === "core"` (not `"uap5174"`)

---

## ADR-017: Performance Optimization Sequence

**Date:** 2026-05-23
**Status:** Accepted

**Decision:**
Three-stage sequence tied to deployment milestones:
1. **Measure now** — word count audit before full KB commit
2. **Topic-based context filtering** — after colleague share (before if >90K words)
3. **RAG** — only when multi-program scope makes filtered context genuinely too large

**Rationale:**
Full-context injection provides accuracy: Jane sees all knowledge on every query and
never misses a relevant policy due to retrieval failure. For the colleague share,
accuracy matters more than latency. RAG introduces retrieval failure modes inappropriate
to deploy before usage patterns are understood. Topic filtering achieves 60–70%
efficiency gain without retrieval risk.

**Consequences:**
- Do not implement RAG before MPIA content is in and topic filtering is proven
- `getContext()` signature unchanged; Phase 3 passes topic as filter parameter

---

## ADR-018: Opening Message as Pre-Populated Assistant Turn

**Date:** 2026-05-23
**Status:** Accepted

**Decision:**
Jane's opening message is a pre-populated `MessageData` object in `messages` state
initial value (`[OPENING_MESSAGE]`). Starter prompt chips render below it when
`messages.length === 1`.

**Rationale:**
A pre-populated message persists in the conversation and travels to the API as a real
assistant turn, establishing tone from the first exchange. An empty-state heading
disappears on the first user message. Chips-below-opening-message requires no
conditional empty-state component.

**Consequences:**
- `messages.length === 0` never occurs in normal operation
- Opening message is part of every API call's conversation history — correct behaviour
- `opening-message.ts` imports `MessageData` from `Message.tsx` (only new cross-dependency)

# Jane — Session Notes

**Last session:** 2026-06-04 (bootstrap — seeded from PROGRESS.md state, not from in-session work)
**Topic:** Bootstrap handover protocol + project context for future sessions in dedicated Claude.ai project
**Working state:** Phase 2 complete · Phase 3 Sprint 2b complete
**Active branch at session end:** `develop` is where Phase 3 work continues; `main` is stable at `e841dc5`
**Live URL state:** stable (`e841dc5` on `main` is the colleague-test URL)

> **NOTE:** This file is a bootstrap, not a true handover. It captures the *known* in-flight state as of the moment Jane was migrated into its own Claude.ai project and the HANDOVER.md protocol was installed. The first real session-end after this should overwrite this file with a proper post-session handover.

---

## 1. Just shipped this session

No code changes this session — this was a project-organisation pass (separating Jane into its own Claude.ai project and installing the handover skill). Nothing to commit on either branch.

## 2. Pending deploy

**For `main`** — these are the **Phase 2 completion items** that have been outstanding and must ship before the colleague URL is shared further (per CLAUDE.md and PROGRESS.md):

```powershell
git checkout main
# After implementing the items below:
git add src/app/api/feedback/route.ts test/jane.spec.ts
git commit -m "feat: feedback backend + 4 remaining browser tests"
git push
```

Items to implement:
- `src/app/api/feedback/route.ts` — feedback backend (wire thumbs-up/down stubs)
- 4 remaining Playwright browser tests:
  - NR elective OMNR prefix disambiguation
  - Late policy disambiguation across instructors
  - Out-of-scope redirect (non-MURP question)
  - AI policy question handling

BRANCHING.md category: **replacement code** for `route.ts` work, **inert code** for test additions — both safe to land on `main` once written and locally tested.

**For `develop`** — Sprint 1 KB additions that haven't yet been created:

```powershell
git checkout develop
git add src/content/murp_sample_paths.md src/content/murp_funding.md
git commit -m "content: add murp_sample_paths.md and murp_funding.md"
git push
```

BRANCHING.md category: **additive content** (safe; could even land directly on `main` per BRANCHING.md rules, but staying on `develop` keeps Phase 3 work cohesive).

## 3. Decisions made this session

None this session. Last ADRs added: **ADR-025** (timetable as semester-refresh KB file) and **ADR-026** (scheduling features as system-prompt instructions). Both already in DECISIONS.md.

## 4. Latent issues surfaced

- **CLAUDE.md staleness:** `Read These Files Before Doing Anything` section says "24 ADRs" but DECISIONS.md now has 26. Counter needs bumping when next ADR lands or as a docs-only patch.
- **PROGRESS.md staleness:** Sprint 2 checkboxes for `useAcademicAdvisor.ts` and `sources` population still red, but Sprint 2b is checked off — sequencing implies Sprint 2 was paused mid-stream to do Sprint 2b first. Worth re-reading the Sprint 2 items to confirm intent.
- **Word count audit overdue:** Target is <90K words before adding more KB files. With `murp_timetable_f26.md` shipped and `murp_sample_paths` + `murp_funding` still to come, audit should be re-run before Sprint 2 wraps. Command in PROGRESS.md.
- **Playwright count drift:** `check_repo.ps1` says 33/0 but no test additions have been committed since then. After Sprint 3/4 add tests, the script's expected count needs updating (PROGRESS.md tracks this as an action item).
- **GEOG 5314 + NR 5884 duplicates:** Both listed twice with different titles/courses. Listed as blockers for Phase 3 RAG ingestion in PROGRESS.md. Email to Geography and NR depts not yet sent.

## 5. Test + integrity status

- Playwright: **33/0** last confirmed (against `main` at `e841dc5`); 4 new tests pending for Phase 2 completion
- `check_repo.ps1`: 69/0 (expected count from Phase 2 — will increment after Sprint 4)
- `pre_deploy_check.py`: last green at Phase 2 completion
- KB word count: unmeasured since `murp_timetable_f26.md` shipped — re-audit before more KB
- Outstanding test debt: 4 from Phase 2 (see section 2)

## 6. Open questions for David

### 🔴 Persistent open items (carry forward across sessions until resolved)

These have sat in `PROGRESS.md` "Blocked / watch items" without movement. They are content blockers, not technical ones — David is the only path to resolution. Re-surface in every session-end handover until they close.

- **GEOG 5314 — duplicate listing** (Geography dept email pending): two entries with different titles. Need confirmation from Geography on the correct course. Blocks Phase 3 RAG ingestion of GEOG content.
- **NR 5884 — duplicate listing** (NR dept email pending): two entries with different course assignments. Need confirmation from NR on the correct numbering. Blocks Phase 3 RAG ingestion of NR content.
- **Kelly Crist — cert split** (email pending): clarify the Gilmore/Crist responsibility split for certificate programs. Blocks accurate certificate routing in `spia_staff_contacts.md`.

### Session-specific questions

- **Colleague share gate:** Are you ready to share `spia-murp-advisor.vercel.app` with Todd Schenk and Dara Wald *after* the Phase 2 completion items ship? Or do you want one more round of personal smoke-testing first?
- **Sprint 3 sequencing:** PROGRESS.md lists 14 separate items for Sprint 3 — is this still the right scope, or has it ballooned and need a Sprint 3a / 3b split like Sprint 2/2b?
- **Vercel Pro upgrade ($20/mo):** PROGRESS.md flags this as a watch item to lift the Hobby tier 10s timeout — has cold-start measurement been done yet, or is it still pending?

## 7. Suggested next session

In order of priority:

1. **Ship Phase 2 completion** (the two items in section 2 → `main`) — this unblocks the colleague share, which is the highest-value milestone before Phase 3 mid-Sprint.
2. **Send the three blocked emails** (Geography, NR, Kelly Crist) — these have likely been sitting for weeks and resolve KB ambiguities ahead of Sprint 3.
3. **Word count audit** (PowerShell one-liner from PROGRESS.md) before adding `murp_sample_paths.md` and `murp_funding.md` — make sure we're not pushing past 90K.
4. **Then resume Sprint 2** (`useAcademicAdvisor.ts` types + populate `sources` field) — small, focused, won't sprawl.
5. **Hold Sprint 3 start** until Sprint 2 is fully green and colleague feedback on `main` is in hand.

If something has gone red since this bootstrap was written, sections 4 and 5 are the places to look first.

---

*Generated via the HANDOVER.md protocol. This file should be overwritten at the next session end with a real session-end handover.*

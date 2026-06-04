---
name: jane-handover
description: Produce or consume a session handover for the Jane project. Use whenever David says "handover", "wrap up", "prep for next session", "switching chats", "compaction prep", "end of session", or at any Sprint or Phase milestone. MANDATORY at session start in a new chat — read SESSION_NOTES.md BEFORE doing anything else, before asking what the user wants. The handover captures volatile in-flight state (files awaiting deploy on either branch, latent bugs surfaced, test status, open questions) that has not yet been promoted to PROGRESS.md or DECISIONS.md.
---

# Jane Handover Skill

A protocol for clean continuity across Claude sessions on the Jane project (`spia-murp-advisor`).

## Why this exists

Jane has more moving parts than a typical web project: two active branches (`main` and `develop`), Sprint-based phasing with a fairly large per-Sprint scope, a Playwright suite whose pass count matters, a knowledge base of 80+ KB markdown files that turns over each semester, and a Vercel auto-deploy from `main` that means every push to that branch hits the colleague-test URL immediately. Without an explicit handover, the next chat either re-discovers all of this painfully or — worse — pushes to the wrong branch.

## Where this fits in the file family

| File | Purpose | Update cadence |
|---|---|---|
| `README.md` | What the project is, architecture overview | Rarely |
| `CLAUDE.md` | Session entry-point context, non-negotiables, current phase | Per phase |
| `BRANCHING.md` | Branch discipline (`main` vs `develop` rules) | Rarely |
| `TESTING.md` | Pre-deployment checklist, regression framework | Per Sprint |
| `AGENTS.md` | Next.js version warning | Rarely |
| `PROGRESS.md` | Phase/Sprint checklists, blocked items, performance sequence | Per Sprint |
| `DECISIONS.md` | ADRs (architectural decisions) | Per decision |
| **`SESSION_NOTES.md`** | **In-flight state** | **Every session** |

The first seven are slow-moving and authoritative for past, deployed reality. `SESSION_NOTES.md` is fast-moving and authoritative for the *present*, undeployed reality on either branch.

## When to invoke

### At session END — write `SESSION_NOTES.md`

Triggers (any one):
- David says "handover", "wrap up", "let's stop here", "switching chats", "prep next session"
- Substantive work was done and files are in `/mnt/user-data/outputs/` or staged but not pushed
- Sprint completed or Phase milestone reached (also update `PROGRESS.md`)
- Several ADR-worthy decisions accumulated (also update `DECISIONS.md`)
- Context window getting full (>60% used) and another sub-task is starting

### At session START — read `SESSION_NOTES.md`

Triggers (any one):
- A new chat opens that touches the Jane project
- David refers to something "we did" or "we decided" with no current-conversation context
- David asks about deployment status, branch state, or open items

Always read `SESSION_NOTES.md` BEFORE writing any code or asking what the user needs. After reading, summarise understanding and wait for confirmation before making changes (per CLAUDE.md convention).

## The handover document — six sections (Jane-adapted)

Use this exact structure in `SESSION_NOTES.md`:

```markdown
# Jane — Session Notes

**Last session:** YYYY-MM-DD
**Topic:** one-line summary of what this session was about
**Working state:** Phase N · Sprint M (or "between Sprints")
**Active branch at session end:** main / develop / both
**Live URL state:** stable (e8XXXXX on main) | risk-deployed (untested merge in last 24h)

---

## 1. Just shipped this session

Commits David confirmed pushing during the session, organised by branch.

**To `main` (production — colleague URL hit immediately):**
- `<short-hash>` `<commit msg>` — what it covered in one sentence ✓ or ?

**To `develop` (preview URL only):**
- `<short-hash>` `<commit msg>` — one sentence ✓ or ?

Use ✓ for confirmed-pushed, ? for "I gave the commit instructions but didn't see confirmation".

## 2. Pending deploy

Files in `/mnt/user-data/outputs/` or staged locally, with explicit target branch.

**For `develop` (safe to push, exploratory):**
```powershell
git checkout develop
git add <files>
git commit -m "<msg>"
git push
```

**For `main` (production — verify safety per BRANCHING.md before pushing):**
```powershell
git checkout main
git add <files>
git commit -m "<msg>"
git push    # ⚠ triggers Vercel production redeploy
```

For each grouped commit: one-line rationale + which BRANCHING.md category it falls under (documentation / additive content / inert code / replacement code).

## 3. Decisions made this session

New ADRs added to `DECISIONS.md`, with their identifier and one-line summary. If decisions were made but not yet promoted to ADRs, list them under "to be promoted".

## 4. Latent issues surfaced

Bugs, gaps, smells noticed during the session that we did NOT fix (or only partially fixed). Include file path and line number when known. Specifically note any:
- ESLint / TypeScript warnings introduced
- Test cases left red or pending
- Performance regressions suspected but not measured
- Cross-branch divergences accumulating
- KB content that David flagged for content owner follow-up

## 5. Test + integrity status

- Playwright count: N/N (`npx playwright test` last passed on YYYY-MM-DD against branch)
- `check_repo.ps1`: N/0 checks passing (update expected count after each Sprint adds tests)
- `pre_deploy_check.py`: pass/fail
- KB word count: ~N words (target <90K for Phase 3)
- Outstanding test debt: items from PROGRESS.md "Phase 2 completion items" still red

## 6. Open questions for David

Items waiting on David's input — content confirmations, ADR judgement calls, scope decisions, content-owner email status (Geography dept duplicates, NR dept duplicates, Kelly Crist cert split, etc.).

**Sub-section: 🔴 Persistent open items (carry forward across sessions until resolved).** Some items are content blockers, not technical ones, and remain unresolved across many sessions because they depend on a third party (e.g. department clarification, content-owner email). These should NOT silently drop off the handover when nothing new happened. Open every session-end handover by carrying the previous handover's persistent items into this sub-section verbatim, then remove only the ones that have actually resolved. List the items first, before session-specific questions, so they remain visually prominent.

## 7. Suggested next session

Concrete starting point. Examples:
- "Resume Sprint 3 with src/lib/useStreamingChat.ts"
- "Wait for colleague feedback on main before merging develop"
- "Run word count audit before adding more KB files"
- "Update PROGRESS.md to mark Sprint 2 complete once knowledge.ts ships to main"
```

## Writing rules

- **Branch every pending item.** Always say which branch the file targets. "Pending deploy: agw_app.js" is incomplete; "Pending deploy to develop: src/lib/useStreamingChat.ts" is correct.
- **Be specific about paths.** Always full path from repo root. `src/lib/knowledge.ts` not "knowledge file".
- **Be honest about uncertainty.** Use `?` markers where you're not sure if something was deployed or where test status is stale.
- **Record patterns discovered, not just code changes.** If a session uncovered that "Vercel cold-start times out at 8s on degree-plan generation", that's a pattern worth Section 4.
- **Don't duplicate PROGRESS.md.** Once an item is in PROGRESS.md's checklist, it leaves SESSION_NOTES.md. Use the Sprint checkboxes as the canonical state, and SESSION_NOTES.md only for what they don't show.
- **Don't duplicate DECISIONS.md.** Once an ADR is logged (ADR-027, ADR-028, ...), the session notes just reference its identifier.
- **Brevity is a feature.** Session notes should fit in 1-2 screens. If they grow longer, things should be migrating to PROGRESS.md.

## Promotion rules (what moves where)

- A *pending deploy* (section 2) becomes a *shipped item* (section 1) the next session, then eventually folds into PROGRESS.md when a Sprint is marked complete.
- An *open question* (section 6) either gets answered and becomes a decision (promotes to ADR) or becomes a pending deploy.
- A *latent issue* (section 4) either gets fixed (becomes a shipped item) or escalates to PROGRESS.md's "Blocked / watch items" table.
- A *persistent open item* (section 6 sub-section, marked 🔴) carries forward verbatim across every handover until David confirms resolution. Do not drop it just because a session didn't touch it. The 🔴 marker is the trigger for "keep this visible".
- *Test status* (section 5) updates inline at each session end — does not promote elsewhere.

## Anti-patterns

Don't write a handover that:
- Lists everything that was discussed (use git log + branch diff for that — handover is for what *matters going forward*)
- Restates decisions already in DECISIONS.md
- Restates milestones already in PROGRESS.md
- Conflates the two branches (always annotate which is in play)
- Is missing pending-deploy commit messages on the right branch (these are the most-used part of the handover)
- Buries blockers in narrative prose instead of putting them in section 6

## Branch-awareness — Jane's particular hazard

The single most-confusing failure mode for Jane sessions is: working on `develop`, forgetting, and accidentally pushing to `main`. The handover format above explicitly forces the branch annotation on every shipping/pending item. When writing or reading SESSION_NOTES.md, if a section talks about pushing without saying which branch, treat that as a defect and ask David which branch it targets before acting.

## Cross-reference: when to consult other files

- About to commit something? → Check BRANCHING.md categories.
- About to ship a `main` push? → Run TESTING.md Section 1 first (`python dev/pre_deploy_check.py`).
- About to write Next.js code? → Check AGENTS.md first; consult `node_modules/next/dist/docs/` for the relevant API.
- Performance concern? → Don't jump to RAG; follow PROGRESS.md's "Performance optimization sequence".

## Worked example

See `SESSION_NOTES.md` in the same directory — produced at the end of the session that created this skill. Use it as a concrete template; the structure transfers, the content does not.

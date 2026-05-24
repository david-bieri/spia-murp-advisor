# Jane — Testing Protocol
## Pre-deployment checklist and regression framework

---

## How to use this document

**Before any `git push`:** run the Static Checks (Section 1) in Claude Code.
**Before any colleague or student share:** run the Manual Browser Tests (Section 2).
**After any knowledge base update:** run Section 3 (KB integrity).
**After any dependency change:** run Section 4 (environment).

Section 1 is implemented as a Claude Code script (`dev/pre_deploy_check.py`).
Sections 2–4 are manual protocols — browser or PowerShell.

---

## Section 1 — Static Checks (Claude Code / automated)

Run via: `python dev/pre_deploy_check.py` from the repo root.

### 1.1 TypeScript build
```
npm run build
```
Any error here blocks deployment. Common failure modes found in this project:
- Topic type mismatch (e.g. `"uap5174"` referenced after removal from type)
- Missing import (e.g. `StarterPrompts.types` not found)
- Case-sensitive filename (e.g. `sidebar.tsx` vs `Sidebar.tsx` on Linux build)

### 1.2 Case-sensitive filename audit
All component files must start with uppercase; all lib/content files with lowercase.
```
src/components/  → all .tsx must start with uppercase letter
src/lib/         → all .ts must start with lowercase letter
src/content/     → all .md must start with lowercase letter
```

### 1.3 Dependency completeness
Every import in `src/` must appear in `package.json > dependencies`.
Known risk imports: `react-markdown`, `@anthropic-ai/sdk`.

### 1.4 Environment variable references
All `process.env.X` references in `src/` must have a corresponding entry
verified in Vercel dashboard. Script checks for undeclared env references.

### 1.5 Content directory integrity
- Minimum file count: warn if `src/content/` has fewer than 20 `.md` files
  (signals KB files were not committed)
- No zero-byte files
- No files with `{unfilled placeholder}` patterns remaining
- No documentation/instruction files (e.g. `jane_renaming_changes.md`)

### 1.6 Topic type consistency
The `Topic` type in `Sidebar.tsx` must match every reference to topic values
in `ChatWindow.tsx`, `knowledge.ts`, and `page.tsx`.
Script extracts the type definition and checks all string literals against it.

### 1.7 Cross-file interface consistency
- `getContext()` signature in `knowledge.ts` must match its call site in `route.ts`
- `MessageData` fields used in `page.tsx` must exist in `Message.tsx`
- `OPENING_MESSAGE` type must satisfy `MessageData`

---

## Section 2 — Manual Browser Tests

Run these in order against the live Vercel URL after deployment.

### 2.1 Load and opening state
| Check | Pass signal |
|---|---|
| Page title | "Jane — MURP Advising, Virginia Tech SPIA" in browser tab |
| Opening message | All three paragraphs visible, updated text present |
| Starter chips | Six chips visible below opening message |
| Feedback icons | 👍 👎 📋 visible below opening message |
| Topic tabs | Two rows: Program\|Admin / Core\|Electives\|Certs |
| Campus nudge absent | No nudge visible on Program tab |

### 2.2 Campus disambiguation sequence
Run these three queries in order without refreshing:

1. No campus selected, topic = Core → ask "What's the late work policy for UAP 5174?"
   **Pass:** Jane asks which campus before answering. Source chips appear.

2. Select Blacksburg, ask same question
   **Pass:** Blacksburg-specific answer arrives within 15 seconds. No hang.

3. Switch to Arlington, ask same question
   **Pass:** Different policy from Blacksburg. No hang.

**Failure modes to watch:**
- Typing indicator freezes (streaming/timeout issue)
- Empty message bubble appears and stays empty (stream hung)
- Error message after 2nd or 3rd query (rate limit or timeout)

### 2.3 Nudge triggers
| Action | Expected nudge |
|---|---|
| Topic = Core, no campus | Amber: "Tip: select a campus..." |
| Topic = Electives, no campus | Amber: "Tip: some electives are campus-specific..." |
| Topic = Admin | Blue: "Jane routes to the right person..." |
| Topic = Core, campus selected | No nudge |
| Send 9+ messages | Green: "Starting a new topic?" with Dismiss button |
| Click Dismiss | Green nudge disappears |

### 2.4 Topic-based context loading
Each query should complete without timeout. Source chips indicate what loaded.

| Tab | Query | Expected sources |
|---|---|---|
| Program | "What's the difference between Plan A and B?" | murp_curriculum, no course syllabi |
| Core | "What does UAP 5084 cover?" | uap5084_*.md files + base |
| Electives | "What electives focus on housing?" | All course files + base |
| Admin | "Who handles travel reimbursement?" | spia_staff_contacts, murp_faqs only |
| Any | "What are the UAP 5174 policies?" | uap5174_*.md files + base (not all 77) |

### 2.5 Staff routing
| Query | Expected contact |
|---|---|
| "Who do I contact about admissions?" | Tyler Wiltshire + email |
| "Who handles assistantships?" | Kelly Crist + email |
| "Travel reimbursement?" | Shelley Adkins + email |
| "Arlington campus contact?" | Elia Amegashie + email |

**Pass:** Named person + correct email every time. No invented contacts.

### 2.6 Out-of-scope handling
| Query | Expected |
|---|---|
| "Recommend which electives I should take" | Declines recommendation, routes to advisor |
| "What's the MPA program like?" | Brief honest answer, routes to contact |
| "What do you think of the new provost?" | Graceful out-of-scope |

### 2.7 Personality layer
| Query | Expected |
|---|---|
| "Robert Moses" | Dry, knowledgeable response. No lecture. |
| Logistics question (deadline, contact) | No personality layering — just the answer |
| Urban design / neighborhood question | Possible Jacobs reference — brief, natural |

### 2.8 Feedback icons
| Action | Expected |
|---|---|
| Click 👍 | Icon activates, "Thanks!" confirmation text |
| Click 👎 | Icon activates, "Thanks — flagged for review" |
| Click 👍 after 👎 (or reverse) | Second icon disabled |
| Click 📋 | "Copied!" for 2 seconds, then resets |

---

## Section 3 — Knowledge Base Integrity (PowerShell)

Run after any KB update (`Copy-Item *.md → src/content/`).

```powershell
# File count — warn if below expected
$count = (Get-ChildItem src\content -Filter *.md).Count
Write-Host "KB files: $count"
if ($count -lt 80) { Write-Host "WARNING: expected 80+, KB may be incomplete" -ForegroundColor Yellow }

# Token estimate
$words = (Get-ChildItem src\content -Filter *.md | Get-Content | Measure-Object -Word).Words
Write-Host "Est. tokens: $([math]::Round($words * 1.33))"

# No zero-byte files
$empty = Get-ChildItem src\content -Filter *.md | Where-Object { $_.Length -eq 0 }
if ($empty) { Write-Host "EMPTY FILES: $($empty.Name)" -ForegroundColor Red }

# No instruction/documentation files accidentally in content
$bad = Get-ChildItem src\content -Filter *.md |
  Where-Object { $_.Name -match "renaming|changes|instructions|checklist|protocol" }
if ($bad) { Write-Host "NON-KB FILES IN CONTENT: $($bad.Name)" -ForegroundColor Red }

# Check for unfilled placeholders
$placeholders = Get-ChildItem src\content -Filter *.md |
  Select-String -Pattern "\{[A-Z_]+\}" -CaseSensitive
if ($placeholders) {
  Write-Host "UNFILLED PLACEHOLDERS:" -ForegroundColor Red
  $placeholders | ForEach-Object { Write-Host "  $($_.Filename):$($_.LineNumber)" }
}
```

---

## Section 4 — Environment and Dependency Checks

```powershell
# Verify ANTHROPIC_API_KEY is set locally
if (-not $env:ANTHROPIC_API_KEY) {
  Write-Host "WARNING: ANTHROPIC_API_KEY not set in this shell" -ForegroundColor Yellow
}

# Verify react-markdown is in package.json
$pkg = Get-Content package.json | ConvertFrom-Json
if (-not $pkg.dependencies.'react-markdown') {
  Write-Host "MISSING: react-markdown not in package.json" -ForegroundColor Red
}

# Verify all expected lib files exist
@(
  "src\lib\knowledge.ts",
  "src\lib\system-prompt.ts",
  "src\lib\opening-message.ts",
  "src\app\api\chat\route.ts",
  "src\components\StarterPrompts.tsx",
  "src\components\Message.tsx",
  "src\components\ChatWindow.tsx",
  "src\components\Sidebar.tsx"
) | ForEach-Object {
  if (-not (Test-Path $_)) {
    Write-Host "MISSING FILE: $_" -ForegroundColor Red
  }
}
```

---

## Section 5 — Known Failure Modes and Fixes

| Symptom | Root cause | Fix |
|---|---|---|
| Vercel build fails: "Module not found" | Case-sensitive filename (sidebar.tsx vs Sidebar.tsx) | `git mv` two-step rename |
| Vercel build fails: TypeScript error on Topic | Topic type string removed from Sidebar.tsx but still referenced in ChatWindow | Update ChatWindow to match |
| Build fails: "Cannot find module X" | Dependency missing from package.json | Add to dependencies, push |
| Typing indicator hangs indefinitely | Streaming connection hung (no timeout) | Revert to non-streaming + AbortController |
| "Something went wrong" on 2nd/3rd query | Anthropic rate limit or Vercel 10s timeout | Course-specific context loading; check API tier |
| Jane answers with no KB content | knowledge.ts hardcoded FILES array not updated | Replace with dynamic readdir |
| System prompt reverted to old version | Git force push overwrote remote commit | Restore from outputs; commit explicitly |
| "+74 more" sources on every query | Course number detection loading all files | Verify COURSE_NUMBER_RE match in knowledge.ts |
| Empty assistant bubble, no error | Stream placeholder inserted before fetch error | Revert to non-streaming |
| KB files missing (Jane has no course knowledge) | Generated .md files not committed to repo | Copy-Item + git add src\content\ |

---

## Recommended workflow before each deployment

1. `python dev/pre_deploy_check.py` — static checks (Section 1)
2. If KB updated: run Section 3 PowerShell block
3. Push: `git add . && git commit -m "..." && git push`
4. Wait for Vercel build — check logs for TypeScript errors
5. Run Section 2.1–2.3 browser tests on live URL
6. If sharing with new users: run full Section 2

---

## Implementation recommendation

**Implement Section 1 as `dev/pre_deploy_check.py`** in Claude Code.
It can run `npm run build`, parse TypeScript output, check filenames,
scan imports, and audit `src/content/` — all without browser interaction.

**Keep Sections 2–4 as this document** (manual). Browser interaction,
Vercel-specific behaviour, and nudge timing cannot be automated without
a headless browser (Playwright/Cypress) — overkill for Phase 2.

**Phase 3 consideration:** if MPIA and MPA content expands the KB further,
add a Playwright smoke test for the disambiguation sequence (Section 2.2).
That's the single highest-value automated browser test given its history
of failures.


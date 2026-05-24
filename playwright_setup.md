# Playwright Setup — Jane E2E Tests

## One-time setup (run once on home computer)

```powershell
cd "C:\Users\bieri\Documents\GitHub\spia-murp-advisor"

# Install Playwright and browser
npm install --save-dev @playwright/test
npx playwright install chromium

# Create tests directory and copy spec file
New-Item -ItemType Directory -Force tests
# Copy jane.spec.ts to tests\jane.spec.ts
```

## Running the tests

**Against live Vercel URL (recommended before every share):**
```powershell
npx playwright test
```

**Against local dev server (faster, no deploy needed):**
```powershell
# Terminal 1:
npm run dev

# Terminal 2:
$env:PLAYWRIGHT_BASE_URL = "http://localhost:3000"
npx playwright test
```

**Run a single section:**
```powershell
npx playwright test -g "campus disambiguation"
npx playwright test -g "response reliability"
npx playwright test -g "staff routing"
```

**View detailed failure report:**
```powershell
npx playwright show-report
```

## What the tests catch

| Section | Failure modes caught |
|---|---|
| 1. Load state | Missing chips, wrong title, wrong opening text |
| 2. Reliability | Hung spinner, empty bubble, Send button stuck |
| 3. Disambiguation | Merging campus policies, no campus check, hang on 2nd query |
| 4. Nudges | Missing/wrong nudges, dismiss not working |
| 5. Sources | Source chips missing, wrong files loaded |
| 6. Feedback | Icons missing, wrong states, copy not working |
| 7. Staff routing | Wrong contacts, missing emails |
| 8. Starter prompts | Chips not firing, not disappearing after use |

## Before sharing with colleagues

Run the full suite and confirm all tests pass:
```powershell
npx playwright test
```

Expected output:
```
  ✓ 1. Load and opening state (5 tests)
  ✓ 2. Response reliability (5 tests)
  ✓ 3. Campus disambiguation (4 tests)
  ✓ 4. Nudges (5 tests)
  ✓ 5. Source chips (3 tests)
  ✓ 6. Feedback icons (4 tests)
  ✓ 7. Staff routing (4 tests)
  ✓ 8. Starter prompts (2 tests)

  32 passed
```

Do not share with colleagues until all 32 pass.

## Adding to CLAUDE.md

Add this to the "Before you start" section:
```
Run tests before pushing: npx playwright test
All 32 must pass before colleague share.
```

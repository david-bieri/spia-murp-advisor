/**
 * jane.spec.ts — End-to-end tests for the Jane MURP advising bot
 *
 * Run against live URL:
 *   npx playwright test --base-url https://spia-murp-advisor.vercel.app
 *
 * Run against local dev server:
 *   npm run dev  (separate terminal)
 *   npx playwright test --base-url http://localhost:3000
 *
 * Run a single section:
 *   npx playwright test -g "campus disambiguation"
 */

import { test, expect, Page } from "@playwright/test";

const TIMEOUT_API    = 45_000; // 45s — covers cold Vercel starts + API latency
const TIMEOUT_UI     = 5_000;  // 5s  — for static DOM checks only

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function waitForResponse(page: Page): Promise<string> {
  await expect(
    page.getByRole("button", { name: "Send" })
  ).toBeEnabled({ timeout: TIMEOUT_API });

  const bubbles = page.locator(".rounded-2xl.rounded-tl-sm");
  const count   = await bubbles.count();
  return (await bubbles.nth(count - 1).textContent()) ?? "";
}

async function sendMessage(page: Page, text: string): Promise<string> {
  await page.getByPlaceholder(/Ask Jane/i).fill(text);
  await page.getByRole("button", { name: "Send" }).click();
  return waitForResponse(page);
}

async function selectCampus(page: Page, campus: "Blacksburg" | "Arlington") {
  await page.getByRole("button", { name: campus }).click();
}

async function selectTopic(page: Page, topic: string) {
  await page.getByRole("button", { name: topic }).click();
}

// ---------------------------------------------------------------------------
// 1. Load and opening state
// ---------------------------------------------------------------------------

test.describe("1. Load and opening state", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("page title is correct", async ({ page }) => {
    // Matches either "Jane — MURP Advising, Virginia Tech SPIA" (current)
    // or any title containing "MURP" — fails only if MURP is absent entirely
    await expect(page).toHaveTitle(/MURP/i, { timeout: 10_000 });
    // Separate check: confirm old stale title is gone
    const title = await page.title();
    expect(title).not.toBe("SPIA MURP Advisor");
  });

  test("opening message is visible with correct text", async ({ page }) => {
    await expect(page.getByText("Hi — I'm Jane")).toBeVisible({ timeout: TIMEOUT_UI });
    await expect(page.getByText(/where the handbook is definitive/i)).toBeVisible();
    await expect(page.getByText(/What are you trying to figure out/i)).toBeVisible();
  });

  test("starter prompt chips are visible", async ({ page }) => {
    // All chips must be attached to DOM
    // rounded-full targets chips only — sidebar buttons use rounded-md
    const chipLabels = ["Course sequence", "Certificate options", "Thesis methods", "UAP 5174 policy"];
    for (const label of chipLabels) {
      const chip = page.locator("button.rounded-full", { hasText: label });
      await expect(chip).toBeAttached({ timeout: TIMEOUT_UI });
      await chip.scrollIntoViewIfNeeded();
      await expect(chip).toBeVisible({ timeout: TIMEOUT_UI });
    }
  });

  test("feedback icons are present on opening message", async ({ page }) => {
    // Match on aria-label substrings as they appear in Message.tsx
    await expect(page.locator('[aria-label="Mark this answer as helpful"]')).toBeVisible({ timeout: TIMEOUT_UI });
    await expect(page.locator('[aria-label="Report this answer as unhelpful"]')).toBeVisible();
    await expect(page.locator('[aria-label="Copy message to clipboard"]')).toBeVisible();
  });

  test("topic tabs render in two rows", async ({ page }) => {
    for (const tab of ["Program", "Admin", "Core", "Electives", "Certs"]) {
      await expect(page.locator("button", { hasText: tab })).toBeVisible({ timeout: TIMEOUT_UI });
    }
  });

  test("header reads Asking about — MURP Program", async ({ page }) => {
    await expect(page.getByText("Asking about", { exact: false })).toBeVisible({ timeout: TIMEOUT_UI });
    await expect(page.getByText("MURP Program")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 2. Response reliability — no hangs, no empty bubbles
// ---------------------------------------------------------------------------
//
// ⚠ IMPORTANT: These tests require a LOCAL dev server, not the Vercel deployment.
// Vercel Hobby plan has a 10s function timeout; API responses take 5–15s.
// Run: npm run dev (Terminal 1), then npx playwright test --base-url http://localhost:3000
//
// To skip API tests and run UI-only tests against Vercel:
//   npx playwright test --grep "Load and opening|Nudges"
// ---------------------------------------------------------------------------

test.describe("2. Response reliability", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("first message returns a non-empty response within 45s", async ({ page }) => {
    const response = await sendMessage(page, "What is the MURP program?");
    expect(response.trim().length).toBeGreaterThan(50);
  });

  test("second consecutive message returns a non-empty response", async ({ page }) => {
    await sendMessage(page, "What is the MURP program?");
    const response = await sendMessage(page, "How many credits does it require?");
    expect(response.trim().length).toBeGreaterThan(20);
  });

  test("third consecutive message does not hang", async ({ page }) => {
    await sendMessage(page, "What is the MURP program?");
    await sendMessage(page, "How many credits does it require?");
    const response = await sendMessage(page, "Who do I contact about admissions?");
    expect(response).not.toContain("Something went wrong");
    expect(response.trim().length).toBeGreaterThan(20);
  });

  test("error message shows on failed request instead of hanging", async ({ page }) => {
    await page.route("**/api/chat", (route) => route.abort("failed"));
    await page.getByPlaceholder(/Ask Jane/i).fill("Test query");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(
      page.getByText(/Something went wrong|try again/i)
    ).toBeVisible({ timeout: TIMEOUT_UI });
  });

  test("Send button re-enables after response", async ({ page }) => {
    await sendMessage(page, "What is the MURP program?");
    await expect(
      page.getByRole("button", { name: "Send" })
    ).toBeEnabled({ timeout: TIMEOUT_UI });
  });
});

// ---------------------------------------------------------------------------
// 3. Campus disambiguation
// Requires local dev server for API calls — see Section 2 note above
// ---------------------------------------------------------------------------

test.describe("3. Campus disambiguation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await selectTopic(page, "Core");
  });

  test("asks which campus when none selected", async ({ page }) => {
    const response = await sendMessage(
      page,
      "What's the late work policy for UAP 5174?"
    );
    expect(response.toLowerCase()).toMatch(/blacksburg|arlington|campus/i);
  });

  test("answers with campus-specific content after Blacksburg selected", async ({
    page,
  }) => {
    await selectCampus(page, "Blacksburg");
    const response = await sendMessage(
      page,
      "What's the late work policy for UAP 5174?"
    );
    expect(response.trim().length).toBeGreaterThan(50);
    expect(response).not.toContain("Something went wrong");
    await expect(page.getByText("Core · Blacksburg")).toBeVisible();
  });

  test("Blacksburg and Arlington responses differ", async ({ page }) => {
    await selectCampus(page, "Blacksburg");
    const bburg = await sendMessage(page, "What's the late work policy for UAP 5174?");

    await page.goto("/");
    await selectTopic(page, "Core");
    await selectCampus(page, "Arlington");
    const arlington = await sendMessage(page, "What's the late work policy for UAP 5174?");

    expect(bburg.trim()).not.toEqual(arlington.trim());
  });

  test("completes disambiguation sequence without hanging", async ({ page }) => {
    await sendMessage(page, "What's the late work policy for UAP 5174?");
    await selectCampus(page, "Blacksburg");
    const response = await sendMessage(
      page,
      "What's the late work policy for UAP 5174?"
    );
    expect(response).not.toContain("Something went wrong");
    expect(response.trim().length).toBeGreaterThan(50);
  });
});

// ---------------------------------------------------------------------------
// 4. Nudges
// ---------------------------------------------------------------------------

test.describe("4. Nudges", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("campus nudge shows on Core tab with no campus", async ({ page }) => {
    await selectTopic(page, "Core");
    await expect(
      page.getByText(/select a campus.*core courses/i)
    ).toBeVisible({ timeout: TIMEOUT_UI });
  });

  test("campus nudge hides when campus is selected", async ({ page }) => {
    await selectTopic(page, "Core");
    await selectCampus(page, "Blacksburg");
    await expect(
      page.getByText(/select a campus.*core courses/i)
    ).not.toBeVisible({ timeout: TIMEOUT_UI });
  });

  test("electives nudge shows on Electives tab with no campus", async ({ page }) => {
    await selectTopic(page, "Electives");
    await expect(
      page.getByText(/some electives are campus-specific/i)
    ).toBeVisible({ timeout: TIMEOUT_UI });
  });

  test("admin nudge shows on Admin tab", async ({ page }) => {
    await selectTopic(page, "Admin");
    await expect(
      page.getByText(/Banner|live systems/i)
    ).toBeVisible({ timeout: TIMEOUT_UI });
  });

  test("long conversation nudge shows after 9 messages and is dismissible", async ({
    page,
  }) => {
    // Mock API so 5 rapid sends don't hit Vercel timeout — nudge is pure UI logic
    await page.route("**/api/chat", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ text: "Mock response for nudge test.", sources: [] }),
      })
    );
    for (let i = 0; i < 5; i++) {
      await sendMessage(page, `Question number ${i + 1}`);
    }
    await expect(
      page.getByText(/fresh conversation/i)
    ).toBeVisible({ timeout: TIMEOUT_UI });
    await page.getByRole("button", { name: "Dismiss" }).click();
    await expect(
      page.getByText(/fresh conversation/i)
    ).not.toBeVisible({ timeout: TIMEOUT_UI });
  });
});

// ---------------------------------------------------------------------------
// 5. Source chips
// Requires local dev server for API calls — see Section 2 note above
// ---------------------------------------------------------------------------

test.describe("5. Source chips", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("source chips appear after any response", async ({ page }) => {
    await sendMessage(page, "What is the MURP program?");
    await expect(
      page.locator(".bg-zinc-200.text-zinc-500").first()
    ).toBeVisible({ timeout: TIMEOUT_UI });
  });

  test("course-specific query shows UAP 5174 in sources", async ({ page }) => {
    await sendMessage(page, "What does UAP 5174 cover?");
    await expect(
      page.locator(".bg-zinc-200.text-zinc-500", { hasText: /UAP 5174/i }).first()
    ).toBeVisible({ timeout: TIMEOUT_UI });
  });

  test("+N more button expands hidden sources", async ({ page }) => {
    await selectTopic(page, "Core");
    await sendMessage(page, "What electives focus on housing?");
    const moreButton = page.locator("button", { hasText: /\+\d+ more/ });
    if (await moreButton.isVisible()) {
      await moreButton.click();
      await expect(moreButton).not.toBeVisible({ timeout: TIMEOUT_UI });
    }
  });
});

// ---------------------------------------------------------------------------
// 6. Feedback icons
// Requires local dev server for API calls — see Section 2 note above
// ---------------------------------------------------------------------------

test.describe("6. Feedback icons", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await sendMessage(page, "What is the MURP program?");
  });

  test("thumbs up activates and shows confirmation", async ({ page }) => {
    await page.locator('[aria-label="Mark this answer as helpful"]').last().click();
    await expect(page.getByText("Thanks!")).toBeVisible({ timeout: TIMEOUT_UI });
  });

  test("thumbs down activates and shows confirmation", async ({ page }) => {
    await page.locator('[aria-label="Report this answer as unhelpful"]').last().click();
    await expect(page.getByText(/flagged for review/i)).toBeVisible({ timeout: TIMEOUT_UI });
  });

  test("copy button shows Copied confirmation", async ({ page }) => {
    await page.locator('[aria-label="Copy message to clipboard"]').last().click();
    await expect(page.getByText("Copied!")).toBeVisible({ timeout: TIMEOUT_UI });
  });

  test("thumbs up disables thumbs down", async ({ page }) => {
    await page.locator('[aria-label="Mark this answer as helpful"]').last().click();
    await expect(
      page.locator('[aria-label="Report this answer as unhelpful"]').last()
    ).toBeDisabled({ timeout: TIMEOUT_UI });
  });
});

// ---------------------------------------------------------------------------
// 7. Staff routing
// Requires local dev server for API calls — see Section 2 note above
// ---------------------------------------------------------------------------

test.describe("7. Staff routing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await selectTopic(page, "Admin");
  });

  test("admissions query routes to Tyler Wiltshire", async ({ page }) => {
    const response = await sendMessage(page, "Who do I contact about admissions?");
    expect(response).toMatch(/wiltshire|Tyler/i);
  });

  test("assistantship query routes to Kelly Crist", async ({ page }) => {
    const response = await sendMessage(page, "Who handles graduate assistantships?");
    expect(response).toMatch(/crist|Kelly/i);
  });

  test("travel reimbursement routes to Shelley Adkins", async ({ page }) => {
    const response = await sendMessage(page, "How do I get reimbursed for travel?");
    expect(response).toMatch(/adkins|Shelley/i);
  });

  test("staff responses include email addresses", async ({ page }) => {
    const response = await sendMessage(page, "Who do I contact about admissions?");
    expect(response).toMatch(/@vt\.edu/i);
  });
});

// ---------------------------------------------------------------------------
// 8. Starter prompts
// Requires local dev server for API calls — see Section 2 note above
// ---------------------------------------------------------------------------

test.describe("8. Starter prompts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("clicking a starter chip sends the message", async ({ page }) => {
    await page.locator("button", { hasText: "Course sequence" }).click();
    await expect(
      page.getByText(/two-year MURP course sequence/i)
    ).toBeVisible({ timeout: TIMEOUT_UI });
  });

  test("starter chips disappear after first message sent", async ({ page }) => {
    await sendMessage(page, "Hello");
    await expect(
      page.locator("button", { hasText: "Course sequence" })
    ).not.toBeVisible({ timeout: TIMEOUT_UI });
  });
});

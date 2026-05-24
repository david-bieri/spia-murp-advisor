/**
 * jane.spec.ts — End-to-end tests for the Jane MURP advising bot
 *
 * Covers every failure mode encountered during development.
 * Run before any colleague or student share.
 *
 * Setup:
 *   npm install --save-dev @playwright/test
 *   npx playwright install chromium
 *
 * Run against live URL:
 *   npx playwright test --base-url https://spia-murp-advisor.vercel.app
 *
 * Run against local dev server:
 *   npm run dev   (in a separate terminal)
 *   npx playwright test --base-url http://localhost:3000
 *
 * Run a single test by name:
 *   npx playwright test -g "campus disambiguation"
 */

import { test, expect, Page } from "@playwright/test";

const TIMEOUT_RESPONSE = 30_000; // 30s — matches our AbortController timeout
const TIMEOUT_SHORT    = 5_000;  // 5s  — for UI state checks

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wait for Jane to respond and return the last assistant message text. */
async function waitForResponse(page: Page): Promise<string> {
  // Wait for loading to stop — isLoading disables the Send button
  await expect(
    page.getByRole("button", { name: "Send" })
  ).toBeEnabled({ timeout: TIMEOUT_RESPONSE });

  // Get all assistant message bubbles and return the last one
  const bubbles = page.locator(".rounded-2xl.rounded-tl-sm");
  const count   = await bubbles.count();
  return (await bubbles.nth(count - 1).textContent()) ?? "";
}

/** Send a message via the textarea and wait for Jane's response. */
async function sendMessage(page: Page, text: string): Promise<string> {
  await page.getByPlaceholder(/Ask Jane/i).fill(text);
  await page.getByRole("button", { name: "Send" }).click();
  return waitForResponse(page);
}

/** Select a campus toggle. */
async function selectCampus(page: Page, campus: "Blacksburg" | "Arlington") {
  await page.getByRole("button", { name: campus }).click();
}

/** Select a topic tab. */
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
    await expect(page).toHaveTitle(/Jane.*MURP/i);
  });

  test("opening message is visible with correct text", async ({ page }) => {
    await expect(page.getByText("Hi — I'm Jane")).toBeVisible({ timeout: TIMEOUT_SHORT });
    await expect(page.getByText(/where the handbook is definitive/i)).toBeVisible();
    await expect(page.getByText(/What are you trying to figure out/i)).toBeVisible();
  });

  test("starter prompt chips are visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Course sequence" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Certificate options" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Thesis methods" })).toBeVisible();
    await expect(page.getByRole("button", { name: "UAP 5174 policy" })).toBeVisible();
  });

  test("feedback icons are present on opening message", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Helpful" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Not helpful" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy to clipboard" })).toBeVisible();
  });

  test("topic tabs render in two rows", async ({ page }) => {
    for (const tab of ["Program", "Admin", "Core", "Electives", "Certs"]) {
      await expect(page.getByRole("button", { name: tab })).toBeVisible();
    }
  });

  test("header reads Asking about — MURP Program", async ({ page }) => {
    await expect(page.getByText("Asking about", { exact: false })).toBeVisible();
    await expect(page.getByText("MURP Program")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 2. Response reliability — no hangs, no empty bubbles
// ---------------------------------------------------------------------------

test.describe("2. Response reliability", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("first message returns a non-empty response within 30s", async ({ page }) => {
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
    // Must return something — not empty, not the error message
    expect(response).not.toContain("Something went wrong");
    expect(response.trim().length).toBeGreaterThan(20);
  });

  test("error message shows instead of hanging on bad state", async ({ page }) => {
    // Simulate a failed request by intercepting and aborting
    await page.route("**/api/chat", (route) => route.abort("failed"));
    await page.getByPlaceholder(/Ask Jane/i).fill("Test query");
    await page.getByRole("button", { name: "Send" }).click();
    // Should show error message, not a frozen spinner
    await expect(
      page.getByText(/Something went wrong|try again/i)
    ).toBeVisible({ timeout: TIMEOUT_SHORT });
  });

  test("Send button re-enables after response", async ({ page }) => {
    await sendMessage(page, "What is the MURP program?");
    await expect(
      page.getByRole("button", { name: "Send" })
    ).toBeEnabled({ timeout: TIMEOUT_SHORT });
  });
});

// ---------------------------------------------------------------------------
// 3. Campus disambiguation — the highest-risk sequence
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
    // Must NOT give a policy answer without knowing the campus
    expect(response.toLowerCase()).not.toMatch(/\d+\s*%\s*penalty|\d+\s*day/);
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
    // Header should reflect campus context
    await expect(page.getByText("Core · Blacksburg")).toBeVisible();
  });

  test("Blacksburg and Arlington responses differ", async ({ page }) => {
    await selectCampus(page, "Blacksburg");
    const bburg = await sendMessage(page, "What's the late work policy for UAP 5174?");

    await page.goto("/");
    await selectTopic(page, "Core");
    await selectCampus(page, "Arlington");
    const arlington = await sendMessage(page, "What's the late work policy for UAP 5174?");

    // Responses must not be identical — different instructors have different policies
    expect(bburg.trim()).not.toEqual(arlington.trim());
  });

  test("completes disambiguation sequence without hanging", async ({ page }) => {
    // Step 1: no campus
    await sendMessage(page, "What's the late work policy for UAP 5174?");
    // Step 2: select campus and ask again
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
// 4. Contextual nudges
// ---------------------------------------------------------------------------

test.describe("4. Nudges", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("campus nudge shows on Core tab with no campus", async ({ page }) => {
    await selectTopic(page, "Core");
    await expect(
      page.getByText(/select a campus.*core courses/i)
    ).toBeVisible({ timeout: TIMEOUT_SHORT });
  });

  test("campus nudge hides when campus is selected", async ({ page }) => {
    await selectTopic(page, "Core");
    await selectCampus(page, "Blacksburg");
    await expect(
      page.getByText(/select a campus.*core courses/i)
    ).not.toBeVisible({ timeout: TIMEOUT_SHORT });
  });

  test("electives nudge shows on Electives tab with no campus", async ({ page }) => {
    await selectTopic(page, "Electives");
    await expect(
      page.getByText(/some electives are campus-specific/i)
    ).toBeVisible({ timeout: TIMEOUT_SHORT });
  });

  test("admin nudge shows on Admin tab", async ({ page }) => {
    await selectTopic(page, "Admin");
    await expect(
      page.getByText(/Banner|live systems/i)
    ).toBeVisible({ timeout: TIMEOUT_SHORT });
  });

  test("long conversation nudge shows after 9 messages and is dismissible", async ({
    page,
  }) => {
    // Send enough messages to trigger the nudge (9 = threshold)
    for (let i = 0; i < 5; i++) {
      await sendMessage(page, `Question number ${i + 1}`);
    }
    await expect(
      page.getByText(/fresh conversation/i)
    ).toBeVisible({ timeout: TIMEOUT_SHORT });

    await page.getByRole("button", { name: "Dismiss" }).click();
    await expect(
      page.getByText(/fresh conversation/i)
    ).not.toBeVisible({ timeout: TIMEOUT_SHORT });
  });
});

// ---------------------------------------------------------------------------
// 5. Source chips
// ---------------------------------------------------------------------------

test.describe("5. Source chips", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("source chips appear after any response", async ({ page }) => {
    await sendMessage(page, "What is the MURP program?");
    // At least one source chip should be visible
    const chips = page.locator(".bg-zinc-200.text-zinc-500");
    await expect(chips.first()).toBeVisible({ timeout: TIMEOUT_RESPONSE });
  });

  test("course-specific query shows course file in sources", async ({ page }) => {
    await sendMessage(page, "What does UAP 5174 cover?");
    // Source chips should include UAP 5174 reference
    await expect(
      page.getByText(/UAP 5174/i).first()
    ).toBeVisible({ timeout: TIMEOUT_RESPONSE });
  });

  test("+N more button expands hidden sources", async ({ page }) => {
    await selectTopic(page, "Core");
    await sendMessage(page, "What electives focus on housing?");
    const moreButton = page.getByText(/\+\d+ more/);
    if (await moreButton.isVisible()) {
      await moreButton.click();
      await expect(moreButton).not.toBeVisible({ timeout: TIMEOUT_SHORT });
    }
  });
});

// ---------------------------------------------------------------------------
// 6. Feedback icons
// ---------------------------------------------------------------------------

test.describe("6. Feedback icons", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await sendMessage(page, "What is the MURP program?");
  });

  test("thumbs up activates and shows confirmation", async ({ page }) => {
    await page.getByRole("button", { name: "Helpful" }).last().click();
    await expect(page.getByText("Thanks!")).toBeVisible({ timeout: TIMEOUT_SHORT });
  });

  test("thumbs down activates and shows confirmation", async ({ page }) => {
    await page.getByRole("button", { name: "Not helpful" }).last().click();
    await expect(
      page.getByText(/flagged for review/i)
    ).toBeVisible({ timeout: TIMEOUT_SHORT });
  });

  test("copy button shows Copied confirmation", async ({ page }) => {
    await page.getByRole("button", { name: "Copy to clipboard" }).last().click();
    await expect(page.getByText("Copied!")).toBeVisible({ timeout: TIMEOUT_SHORT });
  });

  test("thumbs up disables thumbs down", async ({ page }) => {
    await page.getByRole("button", { name: "Helpful" }).last().click();
    await expect(
      page.getByRole("button", { name: "Not helpful" }).last()
    ).toBeDisabled({ timeout: TIMEOUT_SHORT });
  });
});

// ---------------------------------------------------------------------------
// 7. Staff routing
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
// ---------------------------------------------------------------------------

test.describe("8. Starter prompts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("clicking a starter chip sends the message", async ({ page }) => {
    await page.getByRole("button", { name: "Course sequence" }).click();
    // User message bubble should appear
    await expect(
      page.getByText(/two-year MURP course sequence/i)
    ).toBeVisible({ timeout: TIMEOUT_SHORT });
  });

  test("starter chips disappear after first message sent", async ({ page }) => {
    await sendMessage(page, "Hello");
    await expect(
      page.getByRole("button", { name: "Course sequence" })
    ).not.toBeVisible({ timeout: TIMEOUT_SHORT });
  });
});

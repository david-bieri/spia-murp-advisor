import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./test",
  timeout: 45_000,       // per-test timeout — generous for API response time
  retries: 1,            // retry once on failure before marking as failed
  workers: 1,            // sequential — Jane is stateful, parallel breaks tests
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],

  use: {
    baseURL: process.env.BASE_URL ?? process.env.PLAYWRIGHT_BASE_URL ?? "https://spia-murp-advisor.vercel.app",
    trace: "on-first-retry",   // capture trace on failure for debugging
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

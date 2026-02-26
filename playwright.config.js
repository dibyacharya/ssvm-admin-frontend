import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 180_000,
  expect: {
    timeout: 15_000,
  },
  reporter: [["list"], ["html", { outputFolder: "../../reports/playwright_html" }]],
  outputDir: "../../reports/playwright_artifacts",
  use: {
    headless: true,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run start",
      cwd: "../../KIIT_LMS_BACKEND/KIIT_LMS_BACKEND",
      url: "http://127.0.0.1:5000/health",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "CI=1 npm run dev -- --port 3000 --strictPort",
      cwd: ".",
      url: "http://127.0.0.1:3000/login",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "PORT=3001 CI=1 npm start",
      cwd: "../../KIIT_LMS_FRONTEND/KIIT_LMS_FRONTEND",
      url: "http://127.0.0.1:3001/login",
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
});


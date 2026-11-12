import { defineConfig, devices } from "@playwright/test";

// The stack must be running (docker compose, ideally with MOCK_AI=1); see README "Testing".
export const API_URL = process.env.API_URL ?? "http://localhost:8080";
export const API_KEY = process.env.API_KEY ?? "e2e-key";
const WEB_URL = process.env.WEB_URL ?? "http://localhost:8081";
const WEB_PORT = new URL(WEB_URL).port || "8081";

export default defineConfig({
  // One worker: the rate-limit test uses up the per-IP budget that other tests share
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "api", testDir: "./api", use: { baseURL: API_URL } },
    {
      name: "web",
      testDir: "./web",
      // Phone-sized, like the real app
      use: { ...devices["Desktop Chrome"], baseURL: WEB_URL, viewport: { width: 390, height: 844 } },
    },
  ],
  // Serves the exported web app (mobile/dist) unless WEB_URL points somewhere already running
  webServer: process.env.WEB_URL
    ? undefined
    : {
        command: `node serve-web.mjs ../mobile/dist ${WEB_PORT}`,
        url: WEB_URL,
        reuseExistingServer: !process.env.CI,
      },
});

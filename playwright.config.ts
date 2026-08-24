import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const defaultBaseUrl = "http://localhost:3000";
const baseURL = process.env.TEST_BASE_URL ?? defaultBaseUrl;
const target = new URL(baseURL);

const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
const productionHost =
  target.hostname === "slottye.com" || target.hostname.endsWith(".slottye.com");

if (productionHost) {
  throw new Error(
    `E2E bloqueado para producción (${target.origin}). ` +
      "Usa localhost o un entorno de staging.",
  );
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: localHosts.has(target.hostname)
    ? {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});

import { expect, type Page } from "@playwright/test";

const productionHosts = new Set([
  "slottye.com",
  "www.slottye.com",
]);

export function requiredTestEnv(
  names: string[]
): Record<string, string> | null {
  const entries = names.map((name) => [name, process.env[name]?.trim()] as const);

  if (entries.some(([, value]) => !value)) {
    return null;
  }

  return Object.fromEntries(entries) as Record<string, string>;
}

export function assertSafeTestTarget() {
  const rawUrl = process.env.TEST_BASE_URL?.trim();

  if (!rawUrl) {
    return;
  }

  const url = new URL(rawUrl);

  if (productionHosts.has(url.hostname.toLowerCase())) {
    throw new Error(
      "Las pruebas E2E no pueden ejecutarse contra producción. Define TEST_BASE_URL con localhost o staging."
    );
  }
}

export async function loginWithEmail(
  page: Page,
  email: string,
  password: string
) {
  page.on("pageerror", (error) => {
    console.error("Browser page error:", error.message);
  });

  page.on("console", (message) => {
    if (message.type() === "error") {
      console.error("Browser console error:", message.text());
    }
  });

  page.on("response", (response) => {
    if (response.status() >= 400) {
      console.error(
        "Browser response error:",
        response.status(),
        response.url()
      );
    }
  });

  await page.goto("/login");
  await page.getByPlaceholder("tu@email.com").fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole("button", { name: "Entrar con email" }).click();

  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 15_000 });
}

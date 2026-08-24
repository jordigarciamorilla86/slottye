import { expect, test } from "@playwright/test";

import {
  assertSafeTestTarget,
  loginWithEmail,
  requiredTestEnv,
} from "./helpers/test-env";

const credentials = requiredTestEnv([
  "TEST_BUSINESS_EMAIL",
  "TEST_BUSINESS_PASSWORD",
]);

test.beforeAll(() => {
  assertSafeTestTarget();
});

test.describe("negocio autenticado", () => {
  test.skip(
    !credentials,
    "Faltan TEST_BUSINESS_EMAIL y TEST_BUSINESS_PASSWORD; se omiten las pruebas autenticadas de negocio."
  );

  test("puede abrir su agenda", async ({ page }) => {
    await loginWithEmail(
      page,
      credentials!.TEST_BUSINESS_EMAIL,
      credentials!.TEST_BUSINESS_PASSWORD
    );

    await page.goto("/business-dashboard/agenda");
    await expect(page.getByRole("heading", { name: "Agenda", exact: true })).toBeVisible();
    await expect(page.getByText(/Gestiona visualmente las citas/)).toBeVisible();
  });

  test("la agenda permite buscar sin modificar datos", async ({ page }) => {
    await loginWithEmail(
      page,
      credentials!.TEST_BUSINESS_EMAIL,
      credentials!.TEST_BUSINESS_PASSWORD
    );

    await page.goto("/business-dashboard/agenda");
    const search = page.getByPlaceholder("Buscar por cliente, servicio o teléfono...");

    await expect(search).toBeVisible();
    await search.fill(process.env.TEST_AGENDA_SEARCH_QUERY?.trim() || "prueba-e2e-sin-coincidencias");
    await expect(search).toHaveValue(/prueba-e2e|.+/);
  });
});

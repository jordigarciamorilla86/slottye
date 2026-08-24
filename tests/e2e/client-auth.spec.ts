import { expect, test } from "@playwright/test";

import {
  assertSafeTestTarget,
  loginWithEmail,
  requiredTestEnv,
} from "./helpers/test-env";

const credentials = requiredTestEnv([
  "TEST_CLIENT_EMAIL",
  "TEST_CLIENT_PASSWORD",
]);

test.beforeAll(() => {
  assertSafeTestTarget();
});

test.describe("cliente autenticado", () => {
  test.skip(
    !credentials,
    "Faltan TEST_CLIENT_EMAIL y TEST_CLIENT_PASSWORD; se omiten las pruebas autenticadas de cliente."
  );

  test("puede abrir Mis citas", async ({ page }) => {
    await loginWithEmail(
      page,
      credentials!.TEST_CLIENT_EMAIL,
      credentials!.TEST_CLIENT_PASSWORD
    );

    await page.goto("/account/bookings");
    await expect(page.getByRole("heading", { name: "Mis citas" })).toBeVisible();
  });

  test("pagina todo el historial sin perder filas al navegar", async ({ page }) => {
    await loginWithEmail(
      page,
      credentials!.TEST_CLIENT_EMAIL,
      credentials!.TEST_CLIENT_PASSWORD
    );

    await page.goto("/account/bookings#historial");
    const history = page.locator("#historial");
    const total = Number((await history.locator(".mybookings10-count").textContent())?.trim() ?? "0");
    const totalPages = Math.max(1, Math.ceil(total / 6));

    for (let currentPage = 1; currentPage <= totalPages; currentPage += 1) {
      const expectedRows = Math.min(6, total - (currentPage - 1) * 6);
      await expect(history.locator(".mybookings10-history-row")).toHaveCount(expectedRows);

      if (currentPage < totalPages) {
        await history.getByRole("link", { name: /Siguiente/ }).click();
        await expect(history.getByText(`Página ${currentPage + 1} de ${totalPages}`)).toBeVisible();
      }
    }
  });

  test("puede llegar a una cita disponible sin confirmarla", async ({ page }) => {
    test.skip(
      !process.env.TEST_BOOKING_DISCOVERY_PATH?.trim(),
      "Define TEST_BOOKING_DISCOVERY_PATH con una URL relativa de staging que tenga disponibilidad."
    );

    await loginWithEmail(
      page,
      credentials!.TEST_CLIENT_EMAIL,
      credentials!.TEST_CLIENT_PASSWORD
    );

    const discoveryPath = process.env.TEST_BOOKING_DISCOVERY_PATH!.trim();
    expect(discoveryPath.startsWith("/")).toBe(true);

    await page.goto(discoveryPath);
    const bookingAction = page
      .locator("#citas .slots6-time")
      .first();

    await expect(bookingAction).toBeVisible();
    // No se pulsa: la prueba nunca crea ni cancela reservas reales.
  });
});

import { expect, test, type Page } from "@playwright/test";

import {
  assertSafeTestTarget,
  loginWithEmail,
  requiredTestEnv,
} from "./helpers/test-env";

const destructiveEnabled =
  process.env.ALLOW_DESTRUCTIVE_E2E?.trim().toLowerCase() === "true";

const credentials = requiredTestEnv([
  "TEST_CLIENT_EMAIL",
  "TEST_CLIENT_PASSWORD",
  "TEST_BOOKING_DISCOVERY_PATH",
]);

type CreatedBooking = {
  id: string;
  service: string;
  date: string;
  time: string;
};

function assertDestructiveTargetIsSafe() {
  assertSafeTestTarget();

  const target = new URL(
    process.env.TEST_BASE_URL?.trim() || "http://localhost:3000"
  );
  const hostname = target.hostname.toLowerCase();

  if (hostname === "slottye.com" || hostname.endsWith(".slottye.com")) {
    throw new Error(
      `Escritura E2E bloqueada en producción (${target.origin}).`
    );
  }
}

async function cancelThroughApi(page: Page, bookingId: string) {
  assertDestructiveTargetIsSafe();

  return page.request.post("/api/account/bookings/manage", {
    data: {
      action: "cancel",
      bookingId,
    },
  });
}

test.describe.serial("ciclo destructivo controlado de una reserva", () => {
  test.skip(
    !destructiveEnabled,
    "Define ALLOW_DESTRUCTIVE_E2E=true para permitir crear y cancelar una reserva."
  );
  test.skip(
    !credentials,
    "Faltan TEST_CLIENT_EMAIL, TEST_CLIENT_PASSWORD o TEST_BOOKING_DISCOVERY_PATH."
  );

  test("crea, comprueba y cancela una cita del cliente de pruebas", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    assertDestructiveTargetIsSafe();

    const discoveryPath = credentials!.TEST_BOOKING_DISCOVERY_PATH;
    expect(discoveryPath.startsWith("/")).toBe(true);

    let created: CreatedBooking | null = null;
    let cleaned = false;

    await loginWithEmail(
      page,
      credentials!.TEST_CLIENT_EMAIL,
      credentials!.TEST_CLIENT_PASSWORD
    );

    try {
      await page.goto(discoveryPath);

      const firstSlot = page.locator("#citas .slots6-time").first();
      await expect(firstSlot).toBeVisible();
      await firstSlot.click();

      const confirmation = page.getByRole("dialog", {
        name: "Confirmar reserva",
      });
      await expect(confirmation).toBeVisible();

      const service = (
        await confirmation.locator(".slottye-booking-service").innerText()
      ).trim();
      const date = (
        await confirmation
          .locator(".slottye-booking-datetime-item")
          .filter({ hasText: "Fecha" })
          .locator("strong")
          .innerText()
      ).trim();
      const time = (
        await confirmation
          .locator(".slottye-booking-datetime-item")
          .filter({ hasText: "Hora" })
          .locator("strong")
          .innerText()
      ).trim();

      // Última barrera justo antes de la primera escritura.
      assertDestructiveTargetIsSafe();
      const createResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/bookings/create") &&
          response.request().method() === "POST"
      );
      await confirmation
        .getByRole("button", { name: "Confirmar reserva" })
        .click();

      const createResponse = await createResponsePromise;
      expect(createResponse.ok()).toBe(true);
      const payload = (await createResponse.json()) as { bookingId?: string };
      expect(payload.bookingId).toBeTruthy();

      created = {
        id: payload.bookingId!,
        service,
        date,
        time,
      };
      console.info("E2E reserva creada (se cancelará al finalizar):", created);

      const success = page.getByRole("dialog", {
        name: /Tu cita está confirmada/i,
      });
      await expect(success).toBeVisible();
      await success.getByRole("button", { name: "Ver mis citas" }).click();
      await expect(page).toHaveURL(/\/account\/bookings/);

      const bookingCard = page
        .locator(".mybookings10-booking")
        .filter({ hasText: service })
        .filter({ hasText: date })
        .filter({ hasText: time })
        .first();
      await expect(bookingCard).toBeVisible();
      await expect(bookingCard.getByText("Confirmada", { exact: true })).toBeVisible();

      const cancelResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/account/bookings/manage") &&
          response.request().method() === "POST"
      );
      await bookingCard.getByRole("button", { name: "Cancelar cita" }).click();

      const cancellationDialog = page.getByRole("dialog", {
        name: "Cancelar cita",
      });
      await expect(cancellationDialog).toBeVisible();
      await cancellationDialog
        .getByRole("button", { name: "Cancelar cita" })
        .click();

      const cancelResponse = await cancelResponsePromise;
      expect(cancelResponse.ok()).toBe(true);
      cleaned = true;
      await expect(
        page.getByText("Cita cancelada correctamente.").first()
      ).toBeVisible();

      const historyCard = page
        .locator("article")
        .filter({ hasText: service })
        .filter({ hasText: date })
        .filter({ hasText: time })
        .filter({ hasText: "Cancelada por ti" })
        .first();
      await expect(historyCard).toBeVisible();
    } finally {
      if (created && !cleaned) {
        console.warn("E2E: ejecutando cleanup de emergencia para", created);
        const cleanupResponse = await cancelThroughApi(page, created.id);

        if (!cleanupResponse.ok()) {
          throw new Error(
            `El cleanup de la reserva ${created.id} falló con HTTP ${cleanupResponse.status()}. ` +
              "Localízala con los datos registrados y cancélala manualmente."
          );
        }
      }
    }
  });
});

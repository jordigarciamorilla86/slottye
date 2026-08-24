import { createClient } from "@supabase/supabase-js";
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
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
]);

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

function createAdminClient() {
  return createClient(
    credentials!.NEXT_PUBLIC_SUPABASE_URL,
    credentials!.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

async function findTestUserId() {
  const admin = createAdminClient();
  const expectedEmail = credentials!.TEST_CLIENT_EMAIL.toLowerCase();

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) {
      throw new Error(
        `No se pudieron consultar usuarios de prueba (${error.code ?? error.status}).`
      );
    }

    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === expectedEmail
    );

    if (user) {
      return user.id;
    }

    if (data.users.length < 100) {
      break;
    }
  }

  throw new Error("No se pudo localizar el usuario de pruebas en Supabase Auth.");
}

async function submitPasswordChange(
  page: Page,
  currentPassword: string,
  newPassword: string
) {
  await page.getByPlaceholder("Contraseña actual").fill(currentPassword);
  await page.getByPlaceholder("Nueva contraseña", { exact: true }).fill(newPassword);
  await page
    .getByPlaceholder("Repite la nueva contraseña", { exact: true })
    .fill(newPassword);
  await page.getByRole("button", { name: "Cambiar contraseña" }).click();
  await expect(
    page.getByText("Contraseña actualizada correctamente.")
  ).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveURL(/\/account(?:\?|$)/);
}

test.describe.serial("flujos destructivos restaurables de cuenta", () => {
  test.skip(
    !destructiveEnabled,
    "Define ALLOW_DESTRUCTIVE_E2E=true para permitir escrituras restaurables."
  );
  test.skip(
    !credentials,
    "Faltan credenciales de cliente, ruta de negocio o credenciales de servicio Supabase."
  );

  test("cambia la contraseña, conserva la sesión y restaura la original", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    assertDestructiveTargetIsSafe();

    const originalPassword = credentials!.TEST_CLIENT_PASSWORD;
    const temporaryPassword =
      `${originalPassword.slice(0, 40)}Aa9!${Date.now().toString(36)}`;
    const userId = await findTestUserId();
    let passwordChanged = false;
    let restoredThroughUi = false;

    await loginWithEmail(page, credentials!.TEST_CLIENT_EMAIL, originalPassword);

    try {
      await page.goto("/account");
      await page
        .locator(".settings10-row")
        .filter({ hasText: "Contraseña" })
        .click();

      await submitPasswordChange(page, originalPassword, temporaryPassword);
      passwordChanged = true;

      // La página protegida debe seguir disponible con la sesión rotada.
      await page.goto("/account/bookings");
      await expect(page).toHaveURL(/\/account\/bookings/);
      await expect(page.getByRole("heading", { name: "Mis citas" })).toBeVisible();

      await page.goto("/account");
      await page
        .locator(".settings10-row")
        .filter({ hasText: "Contraseña" })
        .click();
      await submitPasswordChange(page, temporaryPassword, originalPassword);
      restoredThroughUi = true;
    } finally {
      if (passwordChanged && !restoredThroughUi) {
        const admin = createAdminClient();
        const { error } = await admin.auth.admin.updateUserById(userId, {
          password: originalPassword,
        });

        if (error) {
          throw new Error(
            `Falló el cleanup de la contraseña de pruebas (${error.code ?? error.status}).`
          );
        }
      }
    }
  });

  test("quita un favorito y lo vuelve a añadir", async ({ page }) => {
    test.setTimeout(45_000);
    assertDestructiveTargetIsSafe();

    const businessPath = credentials!.TEST_BOOKING_DISCOVERY_PATH;
    let initiallyFavorite = false;
    let currentlyFavorite = false;

    await loginWithEmail(
      page,
      credentials!.TEST_CLIENT_EMAIL,
      credentials!.TEST_CLIENT_PASSWORD
    );

    try {
      await page.goto(businessPath);
      const favoriteButton = page.getByRole("button", {
        name: /Guardado|Guardar/,
      });
      await expect(favoriteButton).toBeVisible();
      initiallyFavorite = await favoriteButton.getByText(/Guardado/).isVisible();
      currentlyFavorite = initiallyFavorite;

      if (!currentlyFavorite) {
        await favoriteButton.click();
        await expect(favoriteButton).toContainText("Guardado");
        currentlyFavorite = true;
      }

      await page.goto("/account/saved");
      const removeButton = page.getByRole("button", {
        name: "Quitar favorito",
      }).first();
      await expect(removeButton).toBeVisible();
      page.once("dialog", (dialog) => dialog.accept());
      await removeButton.click();
      await expect(
        page.getByText("Negocio eliminado de favoritos.")
      ).toBeVisible();
      currentlyFavorite = false;

      await page.goto(businessPath);
      const addButton = page.getByRole("button", { name: /Guardar|Guardado/ });
      await expect(addButton).toBeVisible();
      await addButton.click();
      currentlyFavorite = true;
      await expect(addButton).toContainText("Guardado");
    } finally {
      // Si el test creó el favorito solo para poder probar el ciclo, restaura
      // también el estado inicial (no favorito) mediante RLS del propio usuario.
      if (!initiallyFavorite && currentlyFavorite) {
        await page.goto(businessPath);
        const savedButton = page.getByRole("button", { name: /Guardar|Guardado/ });
        if (await savedButton.isVisible()) {
          await savedButton.click();
          await expect(savedButton).toContainText("Guardar");
        }
      }
    }
  });

  test("publica una reseña de una reserva completada y la elimina", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    assertDestructiveTargetIsSafe();

    const admin = createAdminClient();
    const userId = await findTestUserId();
    const { data: completedBookings, error: bookingsError } = await admin
      .from("bookings")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "COMPLETED")
      .order("created_at", { ascending: false });

    if (bookingsError) {
      throw new Error(`No se pudieron consultar reservas (${bookingsError.code}).`);
    }

    const bookingIds = (completedBookings ?? []).map((booking) => booking.id);
    let eligibleBookingId: string | null = null;
    let temporaryBookingId: string | null = null;
    let temporarySlotId: string | null = null;

    if (bookingIds.length > 0) {
      const { data: existingReviews, error: reviewsError } = await admin
        .from("reviews")
        .select("booking_id")
        .in("booking_id", bookingIds);

      if (reviewsError) {
        throw new Error(`No se pudieron consultar reseñas (${reviewsError.code}).`);
      }

      const reviewedIds = new Set(
        (existingReviews ?? []).map((review) => review.booking_id)
      );
      eligibleBookingId = bookingIds.find((id) => !reviewedIds.has(id)) ?? null;
    }

    await loginWithEmail(
      page,
      credentials!.TEST_CLIENT_EMAIL,
      credentials!.TEST_CLIENT_PASSWORD
    );

    try {
      if (!eligibleBookingId) {
        await page.goto(credentials!.TEST_BOOKING_DISCOVERY_PATH);
        const firstSlot = page.locator("#citas .slots6-time").first();
        await expect(firstSlot).toBeVisible();
        await firstSlot.click();

        const confirmation = page.getByRole("dialog", {
          name: "Confirmar reserva",
        });
        await expect(confirmation).toBeVisible();
        const createResponsePromise = page.waitForResponse(
          (response) =>
            response.url().includes("/api/bookings/create") &&
            response.request().method() === "POST"
        );
        assertDestructiveTargetIsSafe();
        await confirmation
          .getByRole("button", { name: "Confirmar reserva" })
          .click();
        const createResponse = await createResponsePromise;
        expect(createResponse.ok()).toBe(true);
        const payload = (await createResponse.json()) as { bookingId?: string };
        expect(payload.bookingId).toBeTruthy();
        temporaryBookingId = payload.bookingId!;

        const { data: temporaryBooking, error: temporaryError } = await admin
          .from("bookings")
          .select("slot_id")
          .eq("id", temporaryBookingId)
          .single();

        if (temporaryError || !temporaryBooking) {
          throw new Error(
            `No se pudo preparar la reserva temporal (${temporaryError?.code ?? "sin datos"}).`
          );
        }
        temporarySlotId = temporaryBooking.slot_id;

        const { error: completionError } = await admin
          .from("bookings")
          .update({ status: "COMPLETED" })
          .eq("id", temporaryBookingId);

        if (completionError) {
          throw new Error(
            `No se pudo completar la reserva temporal (${completionError.code}).`
          );
        }
        eligibleBookingId = temporaryBookingId;
      }

      await page.goto(`/account/bookings?review=${eligibleBookingId}`);
      const dialog = page.getByRole("dialog", { name: "Valora tu cita" });
      await expect(dialog).toBeVisible();
      await dialog.getByRole("button", { name: "5 estrellas" }).click();
      await dialog
        .getByPlaceholder(/Cuéntanos cómo ha sido tu experiencia/)
        .fill("Reseña temporal creada por la prueba E2E.");
      await dialog.getByRole("button", { name: "Publicar reseña" }).click();
      await expect(
        dialog.getByText("Reseña publicada correctamente.")
      ).toBeVisible({ timeout: 15_000 });

      const { data: created, error: createdError } = await admin
        .from("reviews")
        .select("id")
        .eq("booking_id", eligibleBookingId!)
        .single();

      if (createdError || !created) {
        throw new Error(
          `No se pudo verificar la reseña creada (${createdError?.code ?? "sin datos"}).`
        );
      }
    } finally {
      if (eligibleBookingId) {
        const { error } = await admin
          .from("reviews")
          .delete()
          .eq("booking_id", eligibleBookingId);

        if (error) {
          throw new Error(`Falló el cleanup de la reseña (${error.code}).`);
        }
      }

      if (temporaryBookingId) {
        if (!temporarySlotId) {
          const { data } = await admin
            .from("bookings")
            .select("slot_id")
            .eq("id", temporaryBookingId)
            .maybeSingle();
          temporarySlotId = data?.slot_id ?? null;
        }

        const { error } = await admin
          .from("bookings")
          .delete()
          .eq("id", temporaryBookingId);

        if (error) {
          throw new Error(`Falló el cleanup de la reserva (${error.code}).`);
        }
      }

      if (temporarySlotId) {
        const { error } = await admin
          .from("slots")
          .update({ status: "AVAILABLE" })
          .eq("id", temporarySlotId);

        if (error) {
          throw new Error(`Falló el cleanup del horario (${error.code}).`);
        }
      }
    }
  });
});

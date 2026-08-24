import { expect, test } from "@playwright/test";

import {
  assertSafeTestTarget,
  loginWithEmail,
  requiredTestEnv,
} from "./helpers/test-env";

const credentials = requiredTestEnv([
  "TEST_ADMIN_EMAIL",
  "TEST_ADMIN_PASSWORD",
]);

test.beforeAll(() => {
  assertSafeTestTarget();
});

test.describe("gestión administrativa de negocios", () => {
  test.skip(
    !credentials,
    "Faltan TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD; se omite la prueba administrativa."
  );

  test("abre reservas e integra imágenes en Datos y políticas", async ({ page }) => {
    await loginWithEmail(
      page,
      credentials!.TEST_ADMIN_EMAIL,
      credentials!.TEST_ADMIN_PASSWORD
    );

    await page.goto("/admin/businesses");
    await expect(page).toHaveURL(/\/admin\/businesses/);

    const detailHref = await page
      .locator('a[href^="/admin/businesses/"]')
      .evaluateAll((links) => {
        const hrefs = links
          .map((link) => link.getAttribute("href"))
          .filter((href): href is string => Boolean(href));
        return hrefs.find((href) => /^\/admin\/businesses\/[^/]+$/.test(href)) ?? null;
      });

    expect(detailHref).toBeTruthy();
    const businessPath = detailHref!;

    await page.goto(`${businessPath}/bookings`);
    await expect(page).toHaveURL(new RegExp(`${businessPath}/bookings`));
    await expect(page.getByRole("heading", { name: /^Reservas de / })).toBeVisible();

    await page.goto(`${businessPath}/edit#imagenes`);
    await expect(page.getByRole("heading", { name: "Imágenes del negocio" })).toBeVisible();

    await page.goto(`${businessPath}/images`);
    await expect(page).toHaveURL(new RegExp(`${businessPath}/edit#imagenes$`));
  });
});

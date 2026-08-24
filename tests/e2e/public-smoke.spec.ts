import { expect, test } from "@playwright/test";

import { assertSafeTestTarget } from "./helpers/test-env";

test.beforeAll(() => {
  assertSafeTestTarget();
});

test("la portada carga y permite buscar negocios", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Buscar negocio" })).toBeVisible();

  const search = page.getByRole("textbox", {
    name: /Buscar negocio, servicio, ciudad o categor/i,
  });

  await search.fill(process.env.TEST_PUBLIC_SEARCH_QUERY?.trim() || "peluquería");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();

  await expect(page).toHaveURL(/\/category\/todos\?q=/);
  await expect(page.getByRole("main")).toBeVisible();
});

test("la búsqueda de citas conserva el periodo seleccionado", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Buscar una cita" }).click();

  const category = page.locator('select[name="category"]');
  const availableOptions = await category.locator("option:not([disabled])").count();
  test.skip(availableOptions === 0, "Staging no contiene categorías públicas de prueba.");

  await category.selectOption({ index: 1 });
  await page.locator('select[name="when"]').selectOption("tomorrow");
  await page.getByRole("button", { name: "Buscar citas" }).click();

  await expect(page).toHaveURL(/[?&]mode=availability(?:&|$)/);
  await expect(page).toHaveURL(/[?&]when=tomorrow(?:&|$)/);
  await expect(page.locator('select[name="when"]')).toHaveValue("tomorrow");
});

test("la página de categorías públicas responde", async ({ page }) => {
  await page.goto("/category/todos");

  await expect(page.getByRole("main")).toBeVisible();
  await expect(page).toHaveURL(/\/category\/todos/);
});

import { expect, test } from "@playwright/test";
test("confirmación y recuperación demo no inventan órdenes ni números", async ({ page }) => {
  const writes: string[] = [];
  page.on("request", request => { if (request.method() === "POST" && /\/api\/v1\//.test(request.url())) writes.push(request.url()); });
  await page.goto("/orden/confirmacion");
  await expect(page.getByRole("heading", { name: "Sin órdenes en esta demostración" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Números asignados a la orden" })).toHaveCount(0);
  await page.goto("/orden/recuperar");
  await expect(page.getByText("La demostración no crea ni recupera órdenes.", { exact: true })).toBeVisible();
  await page.goto("/privacidad");
  await expect(page.getByRole("heading", { name: "Privacidad de tu participación", exact: true })).toBeVisible();
  expect(writes).toEqual([]);
});

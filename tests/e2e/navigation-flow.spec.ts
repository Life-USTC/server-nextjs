import { expect, test } from "@playwright/test";

test("首页快速入口可跳转到 sections", async ({ page }) => {
  await page.goto("/");
  await page.locator('a[href="/sections"]').first().click();

  await expect(page).toHaveURL(/\/sections(?:\?.*)?$/);
  await expect(page.locator("#main-content")).toBeVisible();
});

test("首页快速入口可跳转到 teachers", async ({ page }) => {
  await page.goto("/");
  await page.locator('a[href="/teachers"]').first().click();

  await expect(page).toHaveURL(/\/teachers(?:\?.*)?$/);
  await expect(page.locator("#main-content")).toBeVisible();
});

test("首页快速入口访问 dashboard 会重定向到登录页", async ({ page }) => {
  await page.goto("/");
  await page.locator('a[href="/dashboard"]').first().click();

  await expect(page).toHaveURL(/\/signin(?:\?.*)?$/);
  await expect(page.getByRole("button", { name: /USTC/i })).toBeVisible();
});

test("sections 页面面包屑可跳转回首页", async ({ page }) => {
  await page.goto("/sections");
  await page.locator('a[href="/"]').first().click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("#main-content")).toBeVisible();
});

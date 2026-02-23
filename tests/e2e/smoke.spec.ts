import { expect, test } from "@playwright/test";

test("首页可访问并显示关键入口", async ({ page }) => {
  await page.goto("/");

  const quickAccessSection = page
    .locator("section")
    .filter({ has: page.locator('a[href="/sections"]') })
    .first();

  await expect(page.locator("#main-content")).toBeVisible();
  await expect(quickAccessSection.locator('a[href="/sections"]')).toBeVisible();
  await expect(quickAccessSection.locator('a[href="/teachers"]')).toBeVisible();
  await expect(
    quickAccessSection.locator('a[href="/dashboard"]'),
  ).toBeVisible();
});

test("登录页可访问并展示第三方登录按钮", async ({ page }) => {
  await page.goto("/signin");

  await expect(page.getByRole("button", { name: /USTC/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /GitHub/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Google/i })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Debug User|调试用户/i }),
  ).toBeVisible();

  await expect(
    page.getByRole("button", {
      name: /Admin User \(Dev\)|调试管理员（开发）/i,
    }),
  ).toBeVisible();
});

test("开发调试用户按钮可一键登录", async ({ page }) => {
  await page.goto("/signin");
  await page
    .getByRole("button", { name: /Debug User|调试用户/i })
    .first()
    .click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("#main-content")).toBeVisible();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/);
  await expect(page.locator("#main-content")).toBeVisible();
});

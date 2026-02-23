import { expect, test } from "@playwright/test";
import { signInAsDevAdmin } from "./utils/auth";

test("调试管理员可登录并访问后台页面", async ({ page }) => {
  await signInAsDevAdmin(page, "/admin/users", "/admin/users");

  await expect(page).toHaveURL(/\/admin\/users(?:\?.*)?$/);
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(page.locator("h1").first()).not.toHaveText("404");
});

test("调试管理员可访问管理后台多个入口", async ({ page }) => {
  await signInAsDevAdmin(page, "/admin/moderation", "/admin/moderation");

  await expect(page).toHaveURL(/\/admin\/moderation(?:\?.*)?$/);
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(page.locator("h1").first()).not.toHaveText("404");

  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/admin\/users(?:\?.*)?$/);
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(page.locator('input[name="search"]').first()).toBeVisible();
});

test("调试管理员可访问管理后台首页并看到入口卡片", async ({ page }) => {
  await signInAsDevAdmin(page, "/admin", "/admin");

  await expect(page).toHaveURL(/\/admin(?:\?.*)?$/);
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(
    page.locator('a[href="/admin/moderation"]').first(),
  ).toBeVisible();
  await expect(page.locator('a[href="/admin/users"]').first()).toBeVisible();
});

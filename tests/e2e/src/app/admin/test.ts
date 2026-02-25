import { expect, test } from "@playwright/test";
import { signInAsDebugUser, signInAsDevAdmin } from "../../../utils/auth";
import { gotoAndWaitForReady } from "../../../utils/page-ready";
import { captureStepScreenshot } from "../../../utils/screenshot";

test("/admin 未登录重定向到登录页", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/admin", {
    expectMainContent: false,
  });

  await expect(page).toHaveURL(/\/signin(?:\?.*)?$/);
  await expect(page.getByRole("button", { name: /USTC/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /GitHub/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Google/i })).toBeVisible();
  await captureStepScreenshot(page, testInfo, "admin-unauthorized");
});

test("/admin 普通用户访问返回 404", async ({ page }, testInfo) => {
  await signInAsDebugUser(page, "/admin", "/admin");
  await expect(page.locator("h1")).toHaveText("404");
  await captureStepScreenshot(page, testInfo, "admin-404");
});

test("/admin 管理员访问成功", async ({ page }, testInfo) => {
  await signInAsDevAdmin(page, "/admin");
  await expect(page).toHaveURL(/\/admin(?:\?.*)?$/);
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(page.locator('a[href="/admin/users"]').first()).toBeVisible();
  await expect(
    page.locator('a[href="/admin/moderation"]').first(),
  ).toBeVisible();
  await captureStepScreenshot(page, testInfo, "admin-home");
});

test("/admin 卡片入口可点击跳转", async ({ page }, testInfo) => {
  await signInAsDevAdmin(page, "/admin");

  await page.locator('a[href="/admin/users"]').first().click();
  await expect(page).toHaveURL(/\/admin\/users(?:\?.*)?$/);
  await captureStepScreenshot(page, testInfo, "admin-navigate-users");

  await gotoAndWaitForReady(page, "/admin");
  await page.locator('a[href="/admin/moderation"]').first().click();
  await expect(page).toHaveURL(/\/admin\/moderation(?:\?.*)?$/);
  await captureStepScreenshot(page, testInfo, "admin-navigate-moderation");
});

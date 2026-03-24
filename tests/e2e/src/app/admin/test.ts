import { expect, test } from "@playwright/test";
import {
  expectRequiresSignIn,
  signInAsDebugUser,
  signInAsDevAdmin,
} from "../../../utils/auth";
import { gotoAndWaitForReady } from "../../../utils/page-ready";
import { captureStepScreenshot } from "../../../utils/screenshot";

test("/admin 未登录重定向到登录页", async ({ page }, testInfo) => {
  await expectRequiresSignIn(page, "/admin", {
    providers: ["ustc", "github", "google"],
  });
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

  const usersCardLink = page.getByRole("link", {
    name: /用户管理|User Management/i,
  });
  await expect(usersCardLink).toBeVisible();
  await Promise.all([
    page.waitForURL(/\/admin\/users(?:\?.*)?$/),
    usersCardLink.click(),
  ]);
  await captureStepScreenshot(page, testInfo, "admin-navigate-users");

  await gotoAndWaitForReady(page, "/admin");
  const moderationCardLink = page.getByRole("link", {
    name: /内容审核|Moderation/i,
  });
  await expect(moderationCardLink).toBeVisible();
  await Promise.all([
    page.waitForURL(/\/admin\/moderation(?:\?.*)?$/),
    moderationCardLink.click(),
  ]);
  await captureStepScreenshot(page, testInfo, "admin-navigate-moderation");
});

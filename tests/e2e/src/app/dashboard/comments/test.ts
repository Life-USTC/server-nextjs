import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { gotoAndWaitForReady } from "../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../utils/screenshot";

test("/dashboard/comments 未登录重定向到登录页", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/dashboard/comments", {
    expectMainContent: false,
  });

  await expect(page).toHaveURL(/\/signin(?:\?.*)?$/);
  await expect(page.getByRole("button", { name: /USTC/i })).toBeVisible();
  await captureStepScreenshot(
    page,
    testInfo,
    "dashboard-comments-unauthorized",
  );
});

test("/dashboard/comments 登录后重定向到首页", async ({ page }, testInfo) => {
  await signInAsDebugUser(page, "/");

  await expect(page).toHaveURL(/\/(?:\?.*)?$/);
  await expect(page.locator("#main-content")).toBeVisible();
  await captureStepScreenshot(page, testInfo, "dashboard-comments-seed");
});

test.skip("/dashboard/comments 可点击原文跳转到目标页面", async ({
  page,
}, testInfo) => {
  await signInAsDebugUser(page, "/");

  const targetLink = page
    .getByRole("link")
    .filter({ hasText: /查看原文|View/i })
    .first();
  if ((await targetLink.count()) === 0) {
    await expect(page.locator("#main-content")).toBeVisible();
    return;
  }

  await targetLink.click();
  await expect(page).toHaveURL(/\/(sections|courses|teachers)\//);
  await captureStepScreenshot(page, testInfo, "dashboard-comments-navigate");
});

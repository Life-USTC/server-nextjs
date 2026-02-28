import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { gotoAndWaitForReady } from "../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../utils/screenshot";

test("/settings/content 未登录重定向到登录页", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/settings/content", {
    expectMainContent: false,
  });

  await expect(page).toHaveURL(/\/signin(?:\?.*)?$/);
  await expect(page.getByRole("button", { name: /USTC/i })).toBeVisible();
  await captureStepScreenshot(page, testInfo, "settings-content-unauthorized");
});

test("/settings/content 登录后展示内容入口", async ({ page }, testInfo) => {
  await signInAsDebugUser(page, "/settings/content");

  await expect(page).toHaveURL(/\/settings\/content(?:\?.*)?$/);
  const contentLinks = page.locator('#main-content .grid a[href="/"]');
  await expect(contentLinks.first()).toBeVisible();
  await expect(contentLinks.nth(1)).toBeVisible();
  await captureStepScreenshot(page, testInfo, "settings-content-links");
});

test("/settings/content 内容入口点击可跳转", async ({ page }, testInfo) => {
  await signInAsDebugUser(page, "/settings/content");

  const contentLinks = page.locator('#main-content .grid a[href="/"]');
  const uploadsLink = contentLinks.first();
  await uploadsLink.click();
  await expect(page).toHaveURL(/\/(?:\?.*)?$/);
  await captureStepScreenshot(
    page,
    testInfo,
    "settings-content-navigate-uploads",
  );

  await gotoAndWaitForReady(page, "/settings/content");
  const commentsLink = page.locator('#main-content .grid a[href="/"]').nth(1);
  await commentsLink.click();
  await expect(page).toHaveURL(/\/(?:\?.*)?$/);
  await captureStepScreenshot(
    page,
    testInfo,
    "settings-content-navigate-comments",
  );
});

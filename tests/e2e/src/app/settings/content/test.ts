import { expect, test } from "@playwright/test";
import {
  expectPagePath,
  expectRequiresSignIn,
  signInAsDebugUser,
} from "../../../../utils/auth";
import { gotoAndWaitForReady } from "../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../utils/screenshot";

test("/settings/content 未登录重定向到登录页", async ({ page }, testInfo) => {
  await expectRequiresSignIn(page, "/settings/content");
  await captureStepScreenshot(page, testInfo, "settings-content-unauthorized");
});

test("/settings/content 登录后展示内容入口", async ({ page }, testInfo) => {
  await signInAsDebugUser(page, "/settings/content");

  await expectPagePath(page, "/settings/content");
  const contentLinks = page.locator('#main-content .grid a[href="/"]');
  const uploadsLink = contentLinks.filter({
    has: page.getByText(/我的上传|My uploads/i),
  });
  const commentsLink = contentLinks.filter({
    has: page.getByText(/我的评论|My comments/i),
  });
  await expect(uploadsLink).toBeVisible();
  await expect(commentsLink).toBeVisible();
  await captureStepScreenshot(page, testInfo, "settings-content-links");
});

test("/settings/content 内容入口点击可跳转", async ({ page }, testInfo) => {
  await signInAsDebugUser(page, "/settings/content");

  const contentLinks = page.locator('#main-content .grid a[href="/"]');
  const uploadsLink = contentLinks.filter({
    has: page.getByText(/我的上传|My uploads/i),
  });
  await uploadsLink.click();
  await expect(page).toHaveURL(/\/(?:\?.*)?$/);
  await captureStepScreenshot(
    page,
    testInfo,
    "settings-content-navigate-uploads",
  );

  await gotoAndWaitForReady(page, "/settings?tab=content");
  const commentsLink = page.locator('#main-content .grid a[href="/"]').filter({
    has: page.getByText(/我的评论|My comments/i),
  });
  await commentsLink.click();
  await expect(page).toHaveURL(/\/(?:\?.*)?$/);
  await captureStepScreenshot(
    page,
    testInfo,
    "settings-content-navigate-comments",
  );
});

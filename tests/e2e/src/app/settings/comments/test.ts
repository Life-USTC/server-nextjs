import { expect, test } from "@playwright/test";
import { expectRequiresSignIn, signInAsDebugUser } from "../../../../utils/auth";
import { captureStepScreenshot } from "../../../../utils/screenshot";

test("/settings/comments 未登录重定向到登录页", async ({ page }, testInfo) => {
  await expectRequiresSignIn(page, "/settings/comments");
  await captureStepScreenshot(page, testInfo, "settings-comments-unauthorized");
});

test("/settings/comments 登录后重定向并展示 seed 评论", async ({
  page,
}, testInfo) => {
  await signInAsDebugUser(page, "/settings/comments", "/");

  await expect(page).toHaveURL(/\/(?:\?.*)?$/);
  await expect(page.locator("#main-content")).toBeVisible();
  await captureStepScreenshot(page, testInfo, "settings-comments-redirect");
});

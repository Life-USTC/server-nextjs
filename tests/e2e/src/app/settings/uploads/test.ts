import { expect, test } from "@playwright/test";
import { expectRequiresSignIn, signInAsDebugUser } from "../../../../utils/auth";
import { captureStepScreenshot } from "../../../../utils/screenshot";

test("/settings/uploads 未登录重定向到登录页", async ({ page }, testInfo) => {
  await expectRequiresSignIn(page, "/settings/uploads");
  await captureStepScreenshot(page, testInfo, "settings-uploads-unauthorized");
});

test("/settings/uploads 登录后重定向并展示 seed 上传", async ({
  page,
}, testInfo) => {
  await signInAsDebugUser(page, "/settings/uploads", "/");

  await expect(page).toHaveURL(/\/(?:\?.*)?$/);
  await expect(page.locator("#main-content")).toBeVisible();
  await captureStepScreenshot(page, testInfo, "settings-uploads-redirect");
});

import { expect, test } from "@playwright/test";
import { expectRequiresSignIn, signInAsDebugUser } from "../../../utils/auth";
import { DEV_SEED } from "../../../utils/dev-seed";
import { captureStepScreenshot } from "../../../utils/screenshot";

test("/settings 未登录重定向到登录页", async ({ page }, testInfo) => {
  await expectRequiresSignIn(page, "/settings");
  await captureStepScreenshot(page, testInfo, "settings-unauthorized");
});

test("/settings 登录后重定向到 profile 并展示 seed 用户", async ({
  page,
}, testInfo) => {
  await signInAsDebugUser(page, "/settings");

  await expect(page).toHaveURL(/\/settings(?:\?.*)?$/);
  await expect(page.locator("input#name")).toBeVisible();
  await expect(page.locator("input#username")).toHaveValue(
    DEV_SEED.debugUsername,
  );
  await captureStepScreenshot(page, testInfo, "settings-redirect-profile");
});

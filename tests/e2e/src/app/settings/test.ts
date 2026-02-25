import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../utils/auth";
import { DEV_SEED } from "../../../utils/dev-seed";
import { gotoAndWaitForReady } from "../../../utils/page-ready";
import { captureStepScreenshot } from "../../../utils/screenshot";

test("/settings 未登录重定向到登录页", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/settings", {
    expectMainContent: false,
  });

  await expect(page).toHaveURL(/\/signin(?:\?.*)?$/);
  await expect(page.getByRole("button", { name: /USTC/i })).toBeVisible();
  await captureStepScreenshot(page, testInfo, "settings-unauthorized");
});

test("/settings 登录后重定向到 profile 并展示 seed 用户", async ({
  page,
}, testInfo) => {
  await signInAsDebugUser(page, "/settings", "/settings/profile");

  await expect(page).toHaveURL(/\/settings\/profile(?:\?.*)?$/);
  await expect(page.locator("input#name")).toBeVisible();
  await expect(page.locator("input#username")).toHaveValue(
    DEV_SEED.debugUsername,
  );
  await captureStepScreenshot(page, testInfo, "settings-redirect-profile");
});

import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../utils/auth";
import { gotoAndWaitForReady } from "../../../utils/page-ready";
import { captureStepScreenshot } from "../../../utils/screenshot";
import { assertPageContract } from "../_shared/page-contract";

test("/signin", async ({ page }, testInfo) => {
  await assertPageContract(page, { routePath: "/signin", testInfo });
});

test("/signin 调试用户按钮可登录", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/signin");

  await captureStepScreenshot(page, testInfo, "signin-initial");

  await signInAsDebugUser(page, "/");
  await expect(page).toHaveURL(/\/(?:\?.*)?$/);
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(page.locator("#app-logo")).toBeVisible();
  await expect(page.locator("#app-user-menu")).toBeVisible();
  await captureStepScreenshot(page, testInfo, "signin-after-login");
});

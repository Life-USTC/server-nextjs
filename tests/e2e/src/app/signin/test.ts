import { expect, test } from "@playwright/test";
import { gotoAndWaitForReady } from "../../../utils/page-ready";
import { captureStepScreenshot } from "../../../utils/screenshot";
import { assertPageContract } from "../_shared/page-contract";

test("/signin", async ({ page }, testInfo) => {
  await assertPageContract(page, { routePath: "/signin", testInfo });
});

test("/signin 调试用户按钮可登录", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/signin");

  await captureStepScreenshot(page, testInfo, "signin-initial");

  await page
    .getByRole("button", { name: /Debug User|调试用户/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/(?:\?.*)?$/);

  await gotoAndWaitForReady(page, "/");
  await expect(page).toHaveURL(/\/(?:\?.*)?$/);
  await expect(page.locator("#main-content")).toBeVisible();
  await captureStepScreenshot(page, testInfo, "signin-after-login");
});

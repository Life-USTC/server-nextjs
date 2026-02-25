import { expect, test } from "@playwright/test";
import { gotoAndWaitForReady } from "../../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../../utils/screenshot";
import { assertPageContract } from "../../../_shared/page-contract";

test("/u/id/[uid]", async ({ page }, testInfo) => {
  await assertPageContract(page, { routePath: "/u/id/[uid]", testInfo });
});

test("/u/id/[uid] 无效用户 ID 返回 404", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/u/id/non-existing-user-id", {
    expectMainContent: false,
  });
  await expect(page.locator("h1")).toHaveText("404");
  await captureStepScreenshot(page, testInfo, "u-id-uid-404");
});

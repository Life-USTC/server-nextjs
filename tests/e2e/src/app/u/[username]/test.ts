import { expect, test } from "@playwright/test";
import { gotoAndWaitForReady } from "../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../utils/screenshot";
import { assertPageContract } from "../../_shared/page-contract";

test("/u/[username]", async ({ page }, testInfo) => {
  await assertPageContract(page, { routePath: "/u/[username]", testInfo });
});

test("/u/[username] 无效用户名返回 404", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/u/non-existing-username", {
    expectMainContent: false,
  });
  await expect(page.locator("h1")).toHaveText("404");
  await expect(
    page.getByRole("link", { name: /返回首页|Home/i }),
  ).toBeVisible();
  await captureStepScreenshot(page, testInfo, "u-username-404");
});

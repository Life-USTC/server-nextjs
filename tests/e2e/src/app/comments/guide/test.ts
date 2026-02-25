import { expect, test } from "@playwright/test";
import { gotoAndWaitForReady } from "../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../utils/screenshot";
import { assertPageContract } from "../../_shared/page-contract";

test("/comments/guide", async ({ page }, testInfo) => {
  await assertPageContract(page, { routePath: "/comments/guide", testInfo });
});

test("/comments/guide 包含 markdown 示例段落", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/comments/guide");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator("pre").first()).toContainText("**Bold**");
  await captureStepScreenshot(page, testInfo, "comments-guide-markdown");
});

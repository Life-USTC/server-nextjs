import { expect, test } from "@playwright/test";
import { gotoAndWaitForReady } from "../../../utils/page-ready";
import { captureStepScreenshot } from "../../../utils/screenshot";
import { assertPageContract } from "../_shared/page-contract";

test("/api-docs", async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await assertPageContract(page, { routePath: "/api-docs", testInfo });
});

test("/api-docs 页面展示 OpenAPI 关键路径", async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await gotoAndWaitForReady(page, "/api-docs", { waitUntil: "load" });
  await expect(page.locator("#swagger-ui")).toContainText("/api/sections", {
    timeout: 30000,
  });
  await captureStepScreenshot(page, testInfo, "api-docs-openapi");
});

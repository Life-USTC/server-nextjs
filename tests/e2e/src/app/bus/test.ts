import { expect, test } from "@playwright/test";
import { DEV_SEED } from "../../../utils/dev-seed";
import { gotoAndWaitForReady } from "../../../utils/page-ready";
import { captureStepScreenshot } from "../../../utils/screenshot";
import { assertPageContract } from "../_shared/page-contract";

test("/bus", async ({ page }, testInfo) => {
  await assertPageContract(page, { routePath: "/bus", testInfo });
});

test("/bus 公开页展示推荐校车与版本信息", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/bus");

  await expect(
    page.getByText(DEV_SEED.bus.versionTitle, { exact: false }).first(),
  ).toBeVisible();
  await expect(
    page.getByText(DEV_SEED.bus.recommendedRoute, { exact: false }).first(),
  ).toBeVisible();
  await expect(
    page.getByText(DEV_SEED.bus.recommendedDeparture, { exact: false }).first(),
  ).toBeVisible();

  await captureStepScreenshot(page, testInfo, "bus-public-page");
});

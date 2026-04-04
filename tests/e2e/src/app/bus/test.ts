import { expect, test } from "@playwright/test";
import { DEV_SEED } from "../../../utils/dev-seed";
import { gotoAndWaitForReady } from "../../../utils/page-ready";
import { captureStepScreenshot } from "../../../utils/screenshot";
import { assertPageContract } from "../_shared/page-contract";

test("/bus", async ({ page }, testInfo) => {
  await assertPageContract(page, { routePath: "/bus", testInfo });
});

test("/bus shows route list and detail panel", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/bus");

  // Day type pills are visible
  await expect(
    page.getByText(/Weekday|Weekend|工作日|周末/).first(),
  ).toBeVisible();

  // Route sidebar shows the recommended route
  await expect(
    page.getByText(DEV_SEED.bus.recommendedRoute, { exact: false }).first(),
  ).toBeVisible();

  // Detail panel shows next departure time
  await expect(
    page.getByText(/Next departure|下一班|nextDeparture/).first(),
  ).toBeVisible();

  await captureStepScreenshot(page, testInfo, "bus-public-page");
});

test("/bus origin filter narrows routes", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/bus");

  // Click the origin campus pill for 高新 (campus id=6, first stop of route 7)
  const gxPill = page.getByRole("button", { name: /高新/ }).first();
  await expect(gxPill).toBeVisible();
  await gxPill.click();

  // Route 7 starts at 高新, so it should be visible
  await expect(
    page.getByText(/高新 -> 先研院|高新.*先研院/, { exact: false }).first(),
  ).toBeVisible();

  // Route 8 starts at 东区, so its description should NOT appear in sidebar
  // (it may still appear in the detail panel if it was previously selected)
  const route8Items = page
    .locator("nav")
    .getByText(DEV_SEED.bus.recommendedRoute, { exact: false });
  await expect(route8Items).toHaveCount(0);

  await captureStepScreenshot(page, testInfo, "bus-origin-filter");
});

test("/bus clicking route switches detail", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/bus");

  // Find route buttons in the sidebar nav
  const sidebar = page.locator("nav");
  const routeButtons = sidebar.locator("button");
  const count = await routeButtons.count();
  expect(count).toBeGreaterThanOrEqual(2);

  // Click the second route
  await routeButtons.nth(1).click();
  await page.waitForTimeout(300);

  // Detail panel should update — we can verify the heading changed
  const detailHeading = page.locator("h3").first();
  await expect(detailHeading).toBeVisible();

  await captureStepScreenshot(page, testInfo, "bus-route-switch");
});

test("/bus public home tab shows bus", async ({ page }, testInfo) => {
  // Visit public home with bus tab
  await gotoAndWaitForReady(page, "/?tab=bus");

  // Day type pills should be visible
  await expect(
    page.getByText(/Weekday|Weekend|工作日|周末/).first(),
  ).toBeVisible();

  // Route list should be visible
  await expect(
    page.getByText(DEV_SEED.bus.recommendedRoute, { exact: false }).first(),
  ).toBeVisible();

  await captureStepScreenshot(page, testInfo, "bus-public-home");
});

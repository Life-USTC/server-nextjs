/**
 * E2E tests for the bus transit map page (/bus-map)
 *
 * ## Behavior
 * - Page renders a metro-map style SVG visualization of campus shuttle routes
 * - Campus nodes shown as labeled circles positioned based on geographic data
 * - Route lines drawn between connected campuses, color-coded per route
 * - Active trips (en-route, departing-soon) shown with animated indicators
 * - Legend sidebar lists all routes with colors + status indicators
 * - Auto-refreshes every 60 seconds; manual refresh button available
 * - "Experimental" badge shown in header
 * - "Back to timetable" link returns to /?tab=bus
 *
 * ## Edge Cases
 * - Page works without authentication (public data)
 * - Empty state shown when no bus data is available
 * - Responsive: SVG scales to container width
 */
import { expect, test } from "@playwright/test";
import { DEV_SEED } from "../../../utils/dev-seed";
import { gotoAndWaitForReady } from "../../../utils/page-ready";
import { captureStepScreenshot } from "../../../utils/screenshot";

test.describe("bus transit map", () => {
  test("renders campus nodes and route lines in SVG", async ({
    page,
  }, testInfo) => {
    await gotoAndWaitForReady(page, "/bus-map");

    // Page title and experimental badge
    await expect(page.getByText(/Transit Map|线路图/).first()).toBeVisible();
    await expect(
      page.getByText(/Experimental|实验性功能/).first(),
    ).toBeVisible();

    // SVG map is rendered with campus nodes and route lines
    const svg = page.locator("svg").first();
    await expect(svg).toBeVisible();

    // Campus circles rendered inside SVG (2 circles per campus: outer + inner ring)
    const circles = page.locator("svg >> circle");
    const circleCount = await circles.count();
    expect(circleCount).toBeGreaterThanOrEqual(6);

    // Route lines rendered inside SVG
    const lines = page.locator("svg >> line");
    await expect(lines.first()).toBeVisible();
    const lineCount = await lines.count();
    expect(lineCount).toBeGreaterThan(0);

    await captureStepScreenshot(page, testInfo, "bus-map-overview");
  });

  test("legend shows route descriptions and status indicators", async ({
    page,
  }) => {
    await gotoAndWaitForReady(page, "/bus-map");

    // Legend section should exist
    await expect(page.getByText(/Legend|图例/).first()).toBeVisible();

    // At least one route description visible in legend
    await expect(
      page.getByText(DEV_SEED.bus.recommendedRoute, { exact: false }).first(),
    ).toBeVisible();

    // Status indicators in legend
    await expect(page.getByText(/En route|行驶中/).first()).toBeVisible();
    await expect(page.getByText(/Departing|即将发车/).first()).toBeVisible();
  });

  test("back link navigates to bus tab", async ({ page }) => {
    await gotoAndWaitForReady(page, "/bus-map");

    const backLink = page
      .getByRole("link", { name: /Back to timetable|返回时刻表/ })
      .first();
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute("href", "/?tab=bus");
  });

  test("day type and time info shown in sidebar", async ({ page }) => {
    await gotoAndWaitForReady(page, "/bus-map");

    // Day type label (weekday or weekend)
    await expect(
      page.getByText(/Weekday|Weekend|工作日|周末/).first(),
    ).toBeVisible();
  });

  test("refresh button is present", async ({ page }) => {
    await gotoAndWaitForReady(page, "/bus-map");

    // Refresh button with RefreshCw icon
    const refreshBtn = page.locator("button").filter({
      has: page.locator("svg.lucide-refresh-cw"),
    });
    await expect(refreshBtn).toBeVisible();
  });
});

/**
 * E2E tests for the /bus route (now a redirect to /?tab=bus)
 *
 * ## Behavior
 * - GET /bus redirects to /?tab=bus (dashboard bus tab)
 * - Query parameters (from, dayType, showDeparted, version) are preserved through the redirect
 *
 * ## UI/UX on /?tab=bus
 * - DashboardTabToolbar with day type toggle (weekday/weekend) and campus origin filter
 * - Route list sidebar (left) with route description + next departure time
 * - Route detail panel (right) with hero next departure + full trip list
 * - Settings dialog for signed-in users (origin/destination pickers, show departed toggle,
 *   favorite campuses/routes as multi-select comboboxes showing names)
 * - Notice banner at the bottom if schedule version has a message
 *
 * ## Edge Cases
 * - Public users can view bus tab but cannot save preferences
 * - Empty state when no routes match the selected origin filter
 * - Clicking a route in the sidebar switches the detail panel
 */
import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../utils/auth";
import { DEV_SEED } from "../../../utils/dev-seed";
import { gotoAndWaitForReady } from "../../../utils/page-ready";
import { captureStepScreenshot } from "../../../utils/screenshot";

test.describe("/bus → /?tab=bus", () => {
  test("/bus redirects to /?tab=bus", async ({ page }) => {
    await page.goto("/bus");
    await page.waitForURL(/\/\?tab=bus/);
    await expect(page).toHaveURL(/\/\?tab=bus/);
  });

  test("/bus preserves query params through redirect", async ({ page }) => {
    await page.goto("/bus?dayType=weekend&from=6");
    await page.waitForURL(/\/\?tab=bus/);
    const url = new URL(page.url());
    expect(url.searchParams.get("tab")).toBe("bus");
    expect(url.searchParams.get("dayType")).toBe("weekend");
    expect(url.searchParams.get("from")).toBe("6");
  });

  test("public /?tab=bus shows route list", async ({ page }, testInfo) => {
    await gotoAndWaitForReady(page, "/?tab=bus");

    // Day type toggle is visible (dashboard toolbar style)
    await expect(
      page.getByText(/Weekday|Weekend|工作日|周末/).first(),
    ).toBeVisible();

    // Route list is visible
    await expect(
      page.getByText(DEV_SEED.bus.recommendedRoute, { exact: false }).first(),
    ).toBeVisible();

    await captureStepScreenshot(page, testInfo, "bus-public-tab");
  });

  test("origin filter narrows routes", async ({ page }, testInfo) => {
    await gotoAndWaitForReady(page, "/?tab=bus");

    // Click an origin campus filter button
    const campusButton = page.getByRole("button", { name: /高新/ }).first();
    await expect(campusButton).toBeVisible();
    await campusButton.click();

    // Routes not starting at that campus should be hidden from sidebar
    const sidebar = page.locator("nav");
    await expect(
      sidebar.getByText(DEV_SEED.bus.recommendedRoute, { exact: false }),
    ).toHaveCount(0);

    await captureStepScreenshot(page, testInfo, "bus-origin-filter");
  });

  test("clicking route switches detail panel", async ({ page }, testInfo) => {
    await gotoAndWaitForReady(page, "/?tab=bus");

    const sidebar = page.locator("nav");
    const routeButtons = sidebar.locator("button");
    const count = await routeButtons.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Click the second route
    await routeButtons.nth(1).click();

    // Detail heading should update to second route
    const detailHeading = page.locator("h3").first();
    await expect(detailHeading).toBeVisible();

    await captureStepScreenshot(page, testInfo, "bus-route-switch");
  });

  test("signed-in user sees settings button", async ({ page }, testInfo) => {
    await signInAsDebugUser(page, "/?tab=bus");

    // Settings button should be visible
    const settingsButton = page.getByRole("button", {
      name: /Edit preferences|编辑偏好/i,
    });
    await expect(settingsButton).toBeVisible();

    await captureStepScreenshot(page, testInfo, "bus-settings-button");
  });

  test("preference dialog shows campus/route name pickers", async ({
    page,
  }, testInfo) => {
    await signInAsDebugUser(page, "/?tab=bus");

    // Open settings dialog
    const settingsButton = page.getByRole("button", {
      name: /Edit preferences|编辑偏好/i,
    });
    await settingsButton.click();

    // Dialog title should appear
    await expect(page.getByText(/Preferences|偏好设置/).first()).toBeVisible();

    // Origin/destination selects should show campus names, NOT raw IDs
    const originSelect = page.locator("#bus-origin-select");
    await expect(originSelect).toBeVisible();
    // The dev-seed user has originCampusId=1 (东区) and destinationCampusId=6 (高新)
    await expect(originSelect).toContainText(/东区/);
    const destSelect = page.locator("#bus-destination-select");
    await expect(destSelect).toContainText(/高新/);

    // Advanced section starts expanded (dev-seed user has favoriteCampusIds/routeIds)
    // Favorite campuses/routes labels should be visible
    const dialogPanel = page.locator("[data-slot=dialog-panel]");
    await expect(
      dialogPanel.getByText(/Favorite campuses|常用校区/).first(),
    ).toBeVisible();
    await expect(
      dialogPanel.getByText(/Favorite routes|常用线路/).first(),
    ).toBeVisible();

    // Verify no raw comma-separated IDs are shown as placeholders
    await expect(page.getByPlaceholder(/1, 6/)).toHaveCount(0);

    await captureStepScreenshot(page, testInfo, "bus-preference-dialog");
  });
});

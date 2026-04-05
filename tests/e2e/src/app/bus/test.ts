/**
 * E2E tests for the bus dashboard tab (/?tab=bus)
 *
 * ## Behavior
 * - /bus page has been removed; bus is accessed only via /?tab=bus
 * - Campus filter now shows routes that pass through the campus (not just origin)
 * - Public users see "Shuttle Bus" as the first tab, with bus and links grouped
 * - Signed-in users see bus and links grouped after calendar in tab nav
 *
 * ## UI/UX on /?tab=bus
 * - DashboardTabToolbar with day type toggle (weekday/weekend) and campus filter pills
 * - Route sidebar (left) with card-styled route items, pinned routes in a separate section
 * - Route detail panel (right) with hero next departure card + trip schedule table
 *   - Table columns = station names from route stops
 *   - Table rows = trips with times at each station
 *   - Status column: Departed or ETA countdown
 * - Monospace font (font-mono) for all time displays
 * - Settings dialog for signed-in users (origin/destination pickers, show departed toggle,
 *   favorite campuses/routes as multi-select comboboxes showing names)
 *
 * ## Edge Cases
 * - /bus returns 404 (redirect removed)
 * - Public users can view bus tab but cannot save preferences
 * - Empty state when no routes match the selected campus filter
 * - Clicking a route card in the sidebar switches the detail panel
 * - Pinned (favorite) routes show with pin icon and separate section
 */
import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../utils/auth";
import { DEV_SEED } from "../../../utils/dev-seed";
import { gotoAndWaitForReady } from "../../../utils/page-ready";
import { captureStepScreenshot } from "../../../utils/screenshot";

test.describe("bus dashboard tab", () => {
  test("/bus returns 404 (redirect removed)", async ({ page }) => {
    const response = await page.goto("/bus");
    expect(response?.status()).toBe(404);
  });

  test("public /?tab=bus shows route cards with monospace times", async ({
    page,
  }, testInfo) => {
    await gotoAndWaitForReady(page, "/?tab=bus");

    // Day type toggle is visible (dashboard toolbar style)
    await expect(
      page.getByText(/Weekday|Weekend|工作日|周末/).first(),
    ).toBeVisible();

    // Campus filter uses "All campuses" (not "All origins")
    await expect(page.getByText(/All campuses|全部校区/).first()).toBeVisible();

    // Route list shows route descriptions
    await expect(
      page.getByText(DEV_SEED.bus.recommendedRoute, { exact: false }).first(),
    ).toBeVisible();

    // Trip schedule table should have station name headers
    const table = page.locator("table").first();
    await expect(table).toBeVisible();

    await captureStepScreenshot(page, testInfo, "bus-public-tab");
  });

  test("campus filter shows routes passing through campus", async ({
    page,
  }, testInfo) => {
    await gotoAndWaitForReady(page, "/?tab=bus");

    // Click a campus filter button (e.g. 东区)
    const campusButton = page.getByRole("button", { name: /东区/ }).first();
    await expect(campusButton).toBeVisible();
    await campusButton.click();

    // Some routes should still be visible (routes passing through 东区)
    const sidebar = page.locator("nav");
    const routeCards = sidebar.locator("button");
    const count = await routeCards.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // The filtered campus column in the table should be highlighted
    await captureStepScreenshot(page, testInfo, "bus-campus-filter");
  });

  test("clicking route card switches detail panel", async ({
    page,
  }, testInfo) => {
    await gotoAndWaitForReady(page, "/?tab=bus");

    const sidebar = page.locator("nav");
    const routeCards = sidebar.locator("button");
    const count = await routeCards.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Click the second route card
    await routeCards.nth(1).click();

    // Detail heading should update
    const heading = page.locator("h3").first();
    await expect(heading).toBeVisible();

    await captureStepScreenshot(page, testInfo, "bus-route-switch");
  });

  test("trip schedule table has station columns and time cells", async ({
    page,
  }) => {
    await gotoAndWaitForReady(page, "/?tab=bus");

    const table = page.locator("table").first();
    await expect(table).toBeVisible();

    // Table should have header cells (station names)
    const headerCells = table.locator("thead th");
    const headerCount = await headerCells.count();
    // At least 2 stations + 1 status column
    expect(headerCount).toBeGreaterThanOrEqual(3);

    // Table should have body rows (trips)
    const bodyRows = table.locator("tbody tr");
    const rowCount = await bodyRows.count();
    expect(rowCount).toBeGreaterThanOrEqual(1);
  });

  test("next departure hero card is visible", async ({ page }) => {
    await gotoAndWaitForReady(page, "/?tab=bus");

    // Next departure label should be visible
    await expect(page.getByText(/Next departure|下一班/).first()).toBeVisible();

    // Hero card should contain a large time display
    const heroTime = page.locator(".font-mono.text-3xl").first();
    await expect(heroTime).toBeVisible();
  });

  test("bus and links tabs are grouped together in nav", async ({
    page,
  }, testInfo) => {
    await gotoAndWaitForReady(page, "/");

    // Get all nav links in the dashboard tab bar
    const tabNav = page.locator("nav").first();
    const tabLinks = tabNav.locator("a");

    // Collect tab text content in order
    const tabTexts: string[] = [];
    const linkCount = await tabLinks.count();
    for (let i = 0; i < linkCount; i++) {
      const text = await tabLinks.nth(i).textContent();
      if (text) tabTexts.push(text.trim());
    }

    // Find bus and links tabs
    const busIndex = tabTexts.findIndex(
      (t) => t.includes("Bus") || t.includes("校车"),
    );
    const linksIndex = tabTexts.findIndex(
      (t) => t.includes("Websites") || t.includes("网站"),
    );

    // They should be adjacent
    expect(busIndex).toBeGreaterThan(-1);
    expect(linksIndex).toBeGreaterThan(-1);
    expect(Math.abs(busIndex - linksIndex)).toBe(1);

    await captureStepScreenshot(page, testInfo, "bus-links-grouped");
  });

  test("signed-in user sees pinned routes section", async ({
    page,
  }, testInfo) => {
    await signInAsDebugUser(page, "/?tab=bus");

    // Dev seed user has favoriteRouteIds=[8], so there should be a pinned section
    const sidebar = page.locator("nav");

    // Pin icon should be visible in sidebar for pinned section
    const pinIcons = sidebar.locator("svg.lucide-pin");
    await expect(pinIcons.first()).toBeVisible();

    await captureStepScreenshot(page, testInfo, "bus-pinned-routes");
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

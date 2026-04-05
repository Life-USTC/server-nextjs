/**
 * E2E tests for the bus dashboard tab (/?tab=bus)
 *
 * ## Behavior
 * - /bus page has been removed; bus is accessed only via /?tab=bus
 * - Campus filter excludes routes where the filtered campus is the final (terminal) stop
 * - Public users see "Shuttle Bus" as the first tab, with bus and links grouped
 * - Signed-in users see bus and links grouped after calendar in tab nav
 *
 * ## UI/UX on /?tab=bus
 * - DashboardTabToolbar with day type toggle (weekday/weekend) and campus filter pills
 * - Inline "Show departed trips" toggle button (Eye/EyeOff icon) in toolbar
 * - Route sidebar (left) with card-styled route items, pinned routes in a separate section
 * - Route detail panel (right) with hero next departure card + trip schedule table
 *   - Table columns = station names from route stops
 *   - Table rows = trips with times at each station
 *   - Status column: Departed or ETA countdown
 * - Monospace font (font-mono) for all time displays
 * - Settings dialog for signed-in users (origin/destination pickers,
 *   favorite campuses/routes as multi-select comboboxes showing names)
 *   - "Show departed trips" toggle is NOT in the settings dialog (it's inline)
 *
 * ## Edge Cases
 * - /bus returns 404 (redirect removed)
 * - Public users can view bus tab but cannot save preferences
 * - Empty state when no routes match the selected campus filter
 * - Clicking a route card in the sidebar switches the detail panel
 * - Pinned (favorite) routes show with pin icon and separate section
 * - Terminal-stop routes excluded from campus filter results
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

  test("campus filter excludes routes with campus as terminal stop", async ({
    page,
  }, testInfo) => {
    await gotoAndWaitForReady(page, "/?tab=bus");

    // Click 东区 campus filter
    const campusButton = page.getByRole("button", { name: /东区/ }).first();
    await expect(campusButton).toBeVisible();
    await campusButton.click();

    const sidebar = page.locator("nav");

    // Route 7 (高新→先研院→西区→东区) has 东区 as final stop — must NOT appear
    // Route 1 (东区→北区→西区), Route 3 (东区→南区), Route 8 (东区→西区→先研院→高新) should appear
    await expect(
      sidebar.getByText("东区 -> 北区 -> 西区", { exact: false }).first(),
    ).toBeVisible();
    await expect(
      sidebar.getByText("东区 -> 南区", { exact: false }).first(),
    ).toBeVisible();

    // Route 7 should NOT be in the sidebar (东区 is its terminal stop)
    await expect(
      sidebar.getByText("高新 -> 先研院 -> 西区 -> 东区", { exact: false }),
    ).toHaveCount(0);

    await captureStepScreenshot(page, testInfo, "bus-campus-filter-terminal");
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

  test("inline show-departed toggle changes table rows", async ({
    page,
  }, testInfo) => {
    await gotoAndWaitForReady(page, "/?tab=bus");

    const table = page.locator("table").first();
    await expect(table).toBeVisible();

    // Count initial rows (only upcoming trips by default)
    const initialRows = await table.locator("tbody tr").count();

    // Find and click the show-departed toggle button
    const departedToggle = page.getByRole("button", {
      name: /Show departed|显示已发车/i,
    });
    await expect(departedToggle).toBeVisible();
    await departedToggle.click();

    // After toggling, row count should be >= initial (includes departed trips)
    const expandedRows = await table.locator("tbody tr").count();
    expect(expandedRows).toBeGreaterThanOrEqual(initialRows);

    // Toggle should show active state (Eye icon visible)
    await expect(departedToggle.locator("svg.lucide-eye")).toBeVisible();

    // Click again to toggle off
    await departedToggle.click();
    await expect(departedToggle.locator("svg.lucide-eye-off")).toBeVisible();

    await captureStepScreenshot(page, testInfo, "bus-departed-toggle");
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

  test("preference dialog shows pickers but not departed toggle", async ({
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

    // "Show departed trips" switch should NOT be in the dialog (moved to inline toggle)
    await expect(
      dialogPanel.getByText(
        /Show departed trips by default|默认展示已发车班次/,
      ),
    ).toHaveCount(0);

    // Verify no raw comma-separated IDs are shown as placeholders
    await expect(page.getByPlaceholder(/1, 6/)).toHaveCount(0);

    await captureStepScreenshot(page, testInfo, "bus-preference-dialog");
  });
});

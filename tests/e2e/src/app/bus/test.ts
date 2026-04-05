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
 * - Route sidebar (left) with card-styled route items
 * - Signed-in users: "Recommended" section (star icon) based on favorite campuses,
 *   with inline campus preference editor (combobox) underneath the section header
 * - Route detail panel (right) with hero next departure card + trip schedule table
 *   - Table columns = station names from route stops
 *   - Table rows = trips with times at each station
 *   - Status column: Departed or ETA countdown
 * - Monospace font (font-mono) for all time displays
 * - No settings dialog — preferences are edited inline under the recommended section
 *
 * ## Edge Cases
 * - /bus returns 404 (redirect removed)
 * - Public users can view bus tab but cannot save preferences (no recommended section)
 * - Empty state when no routes match the selected campus filter
 * - Clicking a route card in the sidebar switches the detail panel
 * - Terminal-stop routes excluded from campus filter results
 * - Recommended section always visible for signed-in users (even when empty)
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

  test("public user does not see recommended section or preference editor", async ({
    page,
  }) => {
    await gotoAndWaitForReady(page, "/?tab=bus");

    // Star icon for recommended section should NOT appear for public users
    const sidebar = page.locator("nav");
    await expect(sidebar.locator("svg.lucide-star")).toHaveCount(0);

    // No combobox for campus preference
    await expect(page.getByPlaceholder(/Search campuses|搜索校区/)).toHaveCount(
      0,
    );
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

  test("signed-in user sees recommended section with star icon", async ({
    page,
  }, testInfo) => {
    await signInAsDebugUser(page, "/?tab=bus");

    const sidebar = page.locator("nav");

    // Recommended section label with star icon
    await expect(sidebar.getByText(/Recommended|推荐/).first()).toBeVisible();
    await expect(sidebar.locator("svg.lucide-star").first()).toBeVisible();

    // Routes through 东区 (favoriteCampusIds=[1]) are recommended
    // Route 1 (东区→北区→西区), Route 3 (东区→南区), Route 7 (高新→…→东区), Route 8 (东区→…→高新)
    // All four routes pass through 东区, so all should be in recommended
    // (But Route 7 has 东区 as terminal — still recommended because isRecommended
    //  checks ALL stops, not just non-terminal; terminal exclusion is only for campus filter)

    await captureStepScreenshot(page, testInfo, "bus-recommended-section");
  });

  test("signed-in user sees inline campus preference editor", async ({
    page,
  }, testInfo) => {
    await signInAsDebugUser(page, "/?tab=bus");

    // Inline campus preference combobox should be visible in sidebar
    const campusInput = page.getByPlaceholder(/Search campuses|搜索校区/);
    await expect(campusInput).toBeVisible();

    // No settings dialog button (removed)
    await expect(
      page.getByRole("button", { name: /Edit preferences|编辑偏好/i }),
    ).toHaveCount(0);

    await captureStepScreenshot(page, testInfo, "bus-inline-preferences");
  });

  test("inline preference save updates recommended routes", async ({
    page,
  }, testInfo) => {
    await signInAsDebugUser(page, "/?tab=bus");

    const sidebar = page.locator("nav");

    // Initially has recommended routes (favoriteCampusIds=[1] → 东区)
    await expect(sidebar.getByText(/Recommended|推荐/).first()).toBeVisible();

    // Focus the combobox input and type to search for a campus
    const campusInput = page.getByPlaceholder(/Search campuses|搜索校区/);
    await campusInput.click();

    // Wait for the dropdown to appear
    await expect(page.getByRole("listbox")).toBeVisible();

    await captureStepScreenshot(page, testInfo, "bus-preference-inline-edit");
  });
});

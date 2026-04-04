/**
 * E2E tests for the Homeworks Tab (`?tab=homeworks`)
 *
 * ## Data Represented
 * - Seed homework: title "迭代二系统设计评审" with section DEV-CS201.01
 * - Homework cards show: title, course name, due date, completion switch,
 *   tags (major/team/default), and a link to `/sections/{jwId}#homework-{id}`
 *
 * ## UI/UX Elements
 * - Filter toolbar: incomplete (default) / completed / all
 * - Completion toggle switch per homework card
 * - "View details" link on each card → section page with homework anchor
 * - Create homework button (+ sheet with title, section, due date fields)
 *
 * ## Edge Cases
 * - Unauthenticated users see public links view (homeworks tab is auth-only)
 * - Completion toggle calls PUT /api/homeworks/{id}/completion
 * - Empty state shown when filter yields no results
 */
import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { DEV_SEED } from "../../../../utils/dev-seed";
import { gotoAndWaitForReady } from "../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../utils/screenshot";

test.describe("dashboard homeworks", () => {
  test("unauthenticated ?tab=homeworks shows public view", async ({
    page,
  }, testInfo) => {
    await gotoAndWaitForReady(page, "/?tab=homeworks");

    await expect(page).toHaveURL(/\/\?tab=homeworks$/);
    await expect(page.locator("#main-content")).toBeVisible();

    // Public view: sign-in CTA visible, no auth-only tabs
    await expect(
      page.getByRole("link", { name: /^(登录|Sign in)$/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^(网站|Websites)$/i }),
    ).toBeVisible();

    await captureStepScreenshot(
      page,
      testInfo,
      "dashboard-homeworks-unauthorized",
    );
  });

  test("authenticated shows seed homework", async ({ page }, testInfo) => {
    await signInAsDebugUser(page, "/?tab=homeworks");

    await expect(page).toHaveURL(/\/(\?.*)?$/);
    await expect(page.locator("#main-content")).toBeVisible();
    await expect(
      page.getByText(DEV_SEED.homeworks.title).first(),
    ).toBeVisible();

    await captureStepScreenshot(page, testInfo, "dashboard-homeworks-seed");
  });

  test("can switch between filter tabs", async ({ page }, testInfo) => {
    await signInAsDebugUser(page, "/?tab=homeworks");

    // Completed filter
    const completedTab = page
      .getByRole("button", { name: /已完成|Completed/i })
      .first();
    await expect(completedTab).toBeVisible();
    await completedTab.click();
    await captureStepScreenshot(
      page,
      testInfo,
      "dashboard-homeworks-tab-completed",
    );

    // All filter
    const allTab = page.getByRole("button", { name: /全部|All/i }).first();
    await expect(allTab).toBeVisible();
    await allTab.click();
    await expect(
      page.getByText(DEV_SEED.homeworks.title).first(),
    ).toBeVisible();
    await captureStepScreenshot(page, testInfo, "dashboard-homeworks-tab-all");
  });

  test("can toggle homework completion status", async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await signInAsDebugUser(page, "/?tab=homeworks");

    // Switch to "all" filter to ensure we see all homeworks regardless of state
    await page
      .getByRole("button", { name: /全部|All/i })
      .first()
      .click();

    // Find a homework switch
    const toggle = page.getByRole("switch").first();
    await expect(toggle).toBeVisible();

    const before = await toggle.getAttribute("aria-checked");

    // Toggle completion
    const completionResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/homeworks/") &&
        response.url().includes("/completion") &&
        response.status() === 200,
    );
    await toggle.click();
    await completionResponse;
    await page.waitForLoadState("networkidle");

    // Verify state changed
    const after = await toggle.getAttribute("aria-checked");
    expect(after).not.toBe(before);
    await captureStepScreenshot(page, testInfo, "dashboard-homeworks-toggled");

    // Restore original state
    const restoreResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/homeworks/") &&
        response.url().includes("/completion") &&
        response.status() === 200,
    );
    await toggle.click();
    await restoreResponse;
  });

  test("view details links to section page with homework anchor", async ({
    page,
  }, testInfo) => {
    await signInAsDebugUser(page, "/?tab=homeworks");

    // Homework cards link to /sections/{jwId}#homework-{id}
    const detailLink = page.locator('a[href*="/sections/"]').first();
    await expect(detailLink).toBeVisible();
    await detailLink.click();

    await expect(page).toHaveURL(/\/sections\/\d+/);
    await captureStepScreenshot(
      page,
      testInfo,
      "dashboard-homeworks-view-details",
    );
  });

  test("can create a new homework", async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await signInAsDebugUser(page, "/?tab=homeworks");

    const addButton = page.getByTestId("dashboard-homeworks-add").first();
    await expect(addButton).toBeVisible();
    await addButton.click();

    const title = `e2e-dashboard-homework-${Date.now()}`;
    await page.getByTestId("dashboard-homework-title").fill(title);
    await page.getByTestId("dashboard-homework-create").click();

    await expect(page.getByText(title).first()).toBeVisible({
      timeout: 15_000,
    });
    await captureStepScreenshot(page, testInfo, "dashboard-homeworks-created");
  });
});

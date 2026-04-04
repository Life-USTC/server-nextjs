/**
 * E2E tests for the Exams Tab (`?tab=exams`)
 *
 * ## Data Represented
 * - Exams flattened from subscribed sections, sorted by date then start time
 * - Each exam card shows: course name, exam date (YYYY-MM-DD), start/end times,
 *   exam mode, and exam rooms
 * - Seed data includes exam(s) from section DEV-CS201.01
 *
 * ## UI/UX Elements
 * - Filter toolbar: incomplete (default, upcoming) / completed (past) / all
 * - Exam cards with course name as title, room as subtitle
 * - Cards link to `/sections/{jwId}` for the associated section
 * - Empty state when no subscriptions or no exams
 *
 * ## Edge Cases
 * - Unauthenticated users see public links view (exams tab is auth-only)
 * - Completed vs incomplete is determined by comparing exam end time to now
 * - Exams without a date appear after dated exams in sort order
 */
import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { gotoAndWaitForReady } from "../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../utils/screenshot";

test.describe("dashboard exams", () => {
  test("unauthenticated ?tab=exams shows public view", async ({
    page,
  }, testInfo) => {
    await gotoAndWaitForReady(page, "/?tab=exams");

    await expect(page).toHaveURL(/\/\?tab=exams$/);
    await expect(page.locator("#main-content")).toBeVisible();

    await expect(
      page.getByRole("link", { name: /^(网站|Websites)$/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^(登录|Sign in)$/i }),
    ).toBeVisible();

    await captureStepScreenshot(page, testInfo, "dashboard-exams-unauthorized");
  });

  test("authenticated shows exams with filter support", async ({
    page,
  }, testInfo) => {
    await signInAsDebugUser(page, "/?tab=exams");

    await expect(page.locator("#main-content")).toBeVisible();

    // Filter toolbar should be present with all/incomplete/completed buttons
    const allFilter = page.getByRole("button", { name: /全部|All/i });
    await expect(allFilter).toBeVisible();

    // Switch to "all" to see all exams
    await allFilter.click();
    await expect(page.locator('a[href^="/sections/"]').first()).toBeVisible();

    await captureStepScreenshot(page, testInfo, "dashboard-exams-all");
  });

  test("exam card links to section detail page", async ({ page }, testInfo) => {
    await signInAsDebugUser(page, "/?tab=exams");

    // Switch to all to ensure we see exams
    await page.getByRole("button", { name: /全部|All/i }).click();

    const sectionLink = page.locator('a[href^="/sections/"]').first();
    await expect(sectionLink).toBeVisible();
    await sectionLink.click();

    await expect(page).toHaveURL(/\/sections\/\d+/);
    await captureStepScreenshot(page, testInfo, "dashboard-exams-section-link");
  });
});

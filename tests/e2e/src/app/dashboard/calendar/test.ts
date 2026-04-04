/**
 * E2E tests for the Calendar Tab (`?tab=calendar`)
 *
 * ## Data Represented
 * - Calendar panel shows a semester/month/week view with:
 *   - Session (class) events mapped from subscribed sections
 *   - Exam events with date, time, mode, and room info
 *   - Homework deadlines with due time and description
 *   - Todo items on their due dates
 * - Seed data includes subscribed section DEV-CS201.01 with sessions and exams
 *
 * ## UI/UX Elements
 * - View toggle toolbar: semester (default) / month / week
 * - Navigation buttons: prev/next semester, month, or week
 * - Calendar grid with day cells showing event cards
 * - Event cards link to section detail pages or exams tab
 * - Copy calendar link button (iCal subscription URL)
 *
 * ## Edge Cases
 * - Unauthenticated users see public links view (calendar is auth-only)
 * - Different layout per view mode (semester grid vs month grid vs week view)
 * - Navigation disabled at semester boundaries
 */
import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { gotoAndWaitForReady } from "../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../utils/screenshot";

test.describe("dashboard calendar", () => {
  test("unauthenticated ?tab=calendar shows public view", async ({
    page,
  }, testInfo) => {
    await gotoAndWaitForReady(page, "/?tab=calendar");

    await expect(page).toHaveURL(/\/\?tab=calendar$/);
    await expect(page.locator("#main-content")).toBeVisible();

    // Public view: links/bus tabs, sign-in CTA
    await expect(
      page.getByRole("link", { name: /^(网站|Websites)$/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^(登录|Sign in)$/i }),
    ).toBeVisible();

    await captureStepScreenshot(
      page,
      testInfo,
      "dashboard-calendar-unauthorized",
    );
  });

  test("authenticated shows semester calendar with section links", async ({
    page,
  }, testInfo) => {
    await signInAsDebugUser(page, "/?tab=calendar");

    await expect(page.locator("#main-content")).toBeVisible();

    // Section links should be present in the calendar
    const sectionLink = page.locator('a[href^="/sections/"]').first();
    await expect(sectionLink).toBeVisible();

    await captureStepScreenshot(page, testInfo, "dashboard-calendar-semester");

    // Click a section link to navigate to section detail
    await sectionLink.click();
    await expect(page).toHaveURL(/\/sections\/\d+/);

    await captureStepScreenshot(
      page,
      testInfo,
      "dashboard-calendar-section-link",
    );
  });

  test("exam card links to exams tab", async ({ page }, testInfo) => {
    await signInAsDebugUser(page, "/?tab=calendar");

    const examLink = page.locator('a[href="/?tab=exams"]').first();
    await expect(examLink).toBeVisible();
    await examLink.click();

    await expect(page).toHaveURL(/\/\?tab=exams$/);
    await captureStepScreenshot(
      page,
      testInfo,
      "dashboard-calendar-exams-link",
    );
  });
});

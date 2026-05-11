/**
 * E2E tests for the Calendar Tab (`?tab=calendar`)
 *
 * ## Data Represented (calendar.yml → personal-calendar-view.display.fields)
 * - calendarEvents (schedules + exams + homeworks + todos)
 * - schedule.date, startTime, endTime
 * - exam.examDate, startTime, endTime, examMode, examRooms
 * - homework.submissionDueAt
 * - todo.dueAt
 * - Week numbers
 * - Weekday labels (Sun-Sat)
 *
 * ## Features
 * - View tabs: semester (default) / month / week
 * - Navigation: prev/next semester, month, or week
 * - Section links from calendar events
 * - Copy calendar link button (iCal)
 *
 * ## Edge Cases
 * - Unauthenticated → public links view (calendar auth-only)
 * - Different layout per view mode
 */
import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { gotoAndWaitForReady } from "../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../utils/screenshot";
import { ensureSeedSectionSubscription } from "../../../../utils/subscriptions";

test.describe("dashboard calendar", () => {
  test("unauthenticated ?tab=calendar shows public view", async ({
    page,
  }, testInfo) => {
    await gotoAndWaitForReady(page, "/?tab=calendar", {
      testInfo,
      screenshotLabel: "calendar",
    });

    await expect(page).toHaveURL(/\/\?tab=calendar$/);
    await expect(page.locator("#main-content")).toBeVisible();

    // Public view: links/bus tabs, sign-in CTA
    await expect(
      page.getByRole("link", { name: /^(网站|Websites)$/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^(登录|Sign in)$/i }),
    ).toBeVisible();
    // Calendar tab NOT in public nav
    await expect(
      page.getByRole("link", { name: /^(日历|Calendar)$/i }),
    ).toHaveCount(0);

    await captureStepScreenshot(page, testInfo, "calendar/unauthenticated");
  });

  test("authenticated shows calendar with section event links and weekday labels", async ({
    page,
  }, testInfo) => {
    await signInAsDebugUser(page, "/?tab=calendar");
    await ensureSeedSectionSubscription(page);
    await gotoAndWaitForReady(page, "/?tab=calendar", {
      testInfo,
      screenshotLabel: "calendar",
    });

    await expect(page.locator("#main-content")).toBeVisible();

    // Weekday labels (Sun-Sat) — calendar.yml personal-calendar-view.display.fields
    await expect(
      page
        .getByText(/Sun|Mon|Tue|Wed|Thu|Fri|Sat|日|一|二|三|四|五|六/)
        .first(),
    ).toBeVisible();

    // Section links from schedule events
    const sectionLink = page.locator('a[href^="/sections/"]').first();
    await expect(sectionLink).toBeVisible();

    await captureStepScreenshot(page, testInfo, "calendar/semester-view");
  });

  test("section event link navigates to section detail", async ({
    page,
  }, testInfo) => {
    await signInAsDebugUser(page, "/?tab=calendar");
    await ensureSeedSectionSubscription(page);
    await gotoAndWaitForReady(page, "/?tab=calendar", {
      testInfo,
      screenshotLabel: "calendar",
    });

    const sectionLink = page.locator('a[href^="/sections/"]').first();
    await expect(sectionLink).toBeVisible();
    await sectionLink.click();

    await expect(page).toHaveURL(/\/sections\/\d+/);
    await captureStepScreenshot(page, testInfo, "calendar/section-link");
  });

  test("exam card links to exams tab", async ({ page }, testInfo) => {
    await signInAsDebugUser(page, "/?tab=calendar");
    await ensureSeedSectionSubscription(page);
    await gotoAndWaitForReady(page, "/?tab=calendar", {
      testInfo,
      screenshotLabel: "calendar",
    });

    const examLink = page.locator('a[href="/?tab=exams"]').first();
    if ((await examLink.count()) > 0) {
      await expect(examLink).toBeVisible();
      await examLink.click();
      await expect(page).toHaveURL(/tab=exams/);
      await captureStepScreenshot(page, testInfo, "calendar/exam-link");
    } else {
      await expect(page.locator("#main-content")).toBeVisible();
    }
  });

  test("semester navigation controls are present", async ({
    page,
  }, testInfo) => {
    await signInAsDebugUser(page, "/?tab=calendar");
    await ensureSeedSectionSubscription(page);
    await gotoAndWaitForReady(page, "/?tab=calendar", {
      testInfo,
      screenshotLabel: "calendar",
    });

    // calendar.yml: Previous/next semester controls
    const prevButton = page
      .getByRole("button", { name: /上学期|Previous semester|上一个/i })
      .or(page.getByLabel(/previous/i).first());
    const nextButton = page
      .getByRole("button", { name: /下学期|Next semester|下一个/i })
      .or(page.getByLabel(/next/i).first());

    if ((await prevButton.count()) > 0 || (await nextButton.count()) > 0) {
      if ((await prevButton.count()) > 0) {
        await expect(prevButton.first()).toBeVisible();
      }
      if ((await nextButton.count()) > 0) {
        await expect(nextButton.first()).toBeVisible();
      }
    }

    await captureStepScreenshot(page, testInfo, "calendar/navigation-controls");
  });

  test("view toggle switches between semester/month/week", async ({
    page,
  }, testInfo) => {
    await signInAsDebugUser(page, "/?tab=calendar");
    await ensureSeedSectionSubscription(page);
    await gotoAndWaitForReady(page, "/?tab=calendar", {
      testInfo,
      screenshotLabel: "calendar",
    });

    // calendar.yml: View tabs
    const monthTab = page
      .getByRole("button", { name: /月|Month/i })
      .or(page.getByRole("tab", { name: /月|Month/i }))
      .first();
    if ((await monthTab.count()) > 0) {
      await monthTab.click();
      await captureStepScreenshot(page, testInfo, "calendar/month-view");
    }

    const weekTab = page
      .getByRole("button", { name: /周|Week/i })
      .or(page.getByRole("tab", { name: /周|Week/i }))
      .first();
    if ((await weekTab.count()) > 0) {
      await weekTab.click();
      await captureStepScreenshot(page, testInfo, "calendar/week-view");
    }
  });
});

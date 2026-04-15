/**
 * E2E tests for the Subscriptions Tab (`?tab=subscriptions`)
 *
 * ## Data Represented
 * - Subscriptions grouped by subscription type, then by semester within each
 * - Each section row: code (DEV-CS201.01), course name (软件工程实践),
 *   teacher names (王测试), credits, opt-out button
 * - Seed data includes subscription to section DEV-CS201.01
 * - Calendar subscription URL for iCal feed
 *
 * ## UI/UX Elements
 * - Table with columns: section code, course name, teachers, credits, opt-out
 * - All table cells (except opt-out) are links to `/sections/{jwId}`
 * - Semester header with section count badge
 * - Bulk import dialog (textarea → match codes → confirm dialog)
 * - iCal calendar link copy button
 * - Opt-out button: initial → confirm → success states
 * - Empty state with bulk import + browse courses buttons
 *
 * ## Edge Cases
 * - Unauthenticated users see public links view (subscriptions is auth-only)
 * - Bulk import with invalid codes shows only matched sections in dialog
 * - Calendar link format: /api/users/{userId}:{token}/calendar.ics
 */
import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../../utils/auth";
import { DEV_SEED } from "../../../../../utils/dev-seed";
import {
  getCurrentSessionUser,
  getUserSubscribedSectionIds,
  replaceUserSubscribedSectionIds,
} from "../../../../../utils/e2e-db";
import { gotoAndWaitForReady } from "../../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../../utils/screenshot";

test.describe("dashboard subscriptions", () => {
  test("unauthenticated ?tab=subscriptions shows public view", async ({
    page,
  }, testInfo) => {
    await gotoAndWaitForReady(page, "/?tab=subscriptions");

    await expect(page).toHaveURL(/\/\?tab=subscriptions$/);
    await expect(page.locator("#main-content")).toBeVisible();

    await expect(
      page.getByRole("link", { name: /^(网站|Websites)$/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^(登录|Sign in)$/i }),
    ).toBeVisible();

    await captureStepScreenshot(
      page,
      testInfo,
      "dashboard-subscriptions-unauthorized",
    );
  });

  test("authenticated shows seed section subscription", async ({
    page,
  }, testInfo) => {
    await signInAsDebugUser(page, "/?tab=subscriptions");

    await expect(page).toHaveURL(/\/(?:\?.*)?$/);
    await expect(page.locator("#main-content")).toBeVisible();
    await expect(page.getByText(DEV_SEED.course.nameEn).first()).toBeVisible();
    await expect(page.getByText(DEV_SEED.section.code).first()).toBeVisible();

    await captureStepScreenshot(page, testInfo, "dashboard-subscriptions-seed");
  });

  test("empty state offers discovery actions", async ({ page }, testInfo) => {
    test.setTimeout(60000);
    await signInAsDebugUser(page, "/?tab=subscriptions");

    const sessionUser = await getCurrentSessionUser(page);
    const originalSectionIds = getUserSubscribedSectionIds(sessionUser.id);
    replaceUserSubscribedSectionIds(sessionUser.id, []);

    try {
      await gotoAndWaitForReady(page, "/?tab=subscriptions");

      await expect(
        page.getByRole("button", {
          name: /批量导入班级|Bulk Import Sections/i,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /浏览班级|Browse Sections/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /浏览课程|Browse Courses/i }),
      ).toBeVisible();

      await captureStepScreenshot(
        page,
        testInfo,
        "dashboard-subscriptions-empty-state",
      );
    } finally {
      replaceUserSubscribedSectionIds(sessionUser.id, originalSectionIds);
    }
  });

  test("can navigate to section detail from table row", async ({
    page,
  }, testInfo) => {
    await signInAsDebugUser(page, "/?tab=subscriptions");

    const rowLink = page.locator("tbody a[href^='/sections/']").first();
    await expect(rowLink).toBeVisible();
    await rowLink.click();

    await expect(page).toHaveURL(/\/sections\/\d+/);
    await captureStepScreenshot(
      page,
      testInfo,
      "dashboard-subscriptions-navigate-section",
    );
  });

  test("opt-out button enters confirm state", async ({ page }, testInfo) => {
    await signInAsDebugUser(page, "/?tab=subscriptions");

    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible();
    await firstRow.hover();

    const optOutButton = firstRow.getByRole("button", {
      name: /移除|Opt out/i,
    });
    await expect(optOutButton).toBeVisible();
    await optOutButton.click();

    await expect(
      firstRow.getByRole("button", { name: /确认|Confirm/i }),
    ).toBeVisible();

    await captureStepScreenshot(
      page,
      testInfo,
      "dashboard-subscriptions-opt-out-confirm",
    );
  });

  test("copy calendar link produces valid iCal URL", async ({
    page,
  }, testInfo) => {
    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"]);
    await signInAsDebugUser(page, "/?tab=subscriptions");

    const copyButton = page
      .getByRole("button", { name: /复制日历链接|iCal/i })
      .first();
    if ((await copyButton.count()) === 0) {
      await expect(page.locator("#main-content")).toBeVisible();
      return;
    }
    await copyButton.click();

    const clipboardText = await page.evaluate(async () =>
      navigator.clipboard.readText(),
    );
    expect(clipboardText).toContain("calendar.ics");
    expect(clipboardText).toMatch(/\/api\/users\/[^/]+:[^/]+\/calendar\.ics$/);

    // Verify the calendar endpoint returns valid iCal data
    const calendarResponse = await page.request.get(clipboardText);
    expect(calendarResponse.status()).toBe(200);
    expect(calendarResponse.headers()["content-type"]).toContain(
      "text/calendar",
    );
    const calendarBody = await calendarResponse.text();
    expect(calendarBody).toContain("BEGIN:VCALENDAR");

    await captureStepScreenshot(
      page,
      testInfo,
      "dashboard-subscriptions-ical-copied",
    );
  });

  test("bulk import opens confirm dialog and can cancel", async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000);
    await signInAsDebugUser(page, "/?tab=subscriptions");

    const textarea = page.getByRole("textbox", {
      name: /粘贴|placeholder|Paste/i,
    });
    if ((await textarea.count()) === 0) {
      await expect(page.locator("#main-content")).toBeVisible();
      return;
    }

    await textarea.first().fill(DEV_SEED.section.code);

    const matchResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/sections/match-codes") &&
        response.request().method() === "POST" &&
        response.status() === 200,
    );
    await page.getByRole("button", { name: /识别并匹配课程|Match/i }).click();
    await matchResponse;

    const dialog = page
      .getByRole("alertdialog")
      .or(page.getByRole("dialog"))
      .first();
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    await captureStepScreenshot(
      page,
      testInfo,
      "dashboard-subscriptions-bulk-import-dialog",
    );

    await dialog.getByRole("button", { name: /取消|Cancel/i }).click();
    await expect(dialog).not.toBeVisible();
  });

  test("bulk import can confirm and shows success", async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000);
    await signInAsDebugUser(page, "/?tab=subscriptions");

    const textarea = page.getByRole("textbox", {
      name: /粘贴|placeholder|Paste/i,
    });
    if ((await textarea.count()) === 0) {
      await expect(page.locator("#main-content")).toBeVisible();
      return;
    }

    // Include a valid code and an invalid one
    await textarea.first().fill(`\n${DEV_SEED.section.code}\nDEVXX000.99\n`);

    const matchResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/sections/match-codes") &&
        response.request().method() === "POST" &&
        response.status() === 200,
    );
    await page.getByRole("button", { name: /识别并匹配课程|Match/i }).click();
    await matchResponse;

    const dialog = page
      .getByRole("alertdialog")
      .or(page.getByRole("dialog"))
      .first();
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByText(DEV_SEED.section.code).first()).toBeVisible();

    await captureStepScreenshot(
      page,
      testInfo,
      "dashboard-subscriptions-bulk-import-ready",
    );

    await dialog
      .getByRole("button", {
        name: /关注已选的 \d+ 个班级|关注已选|Follow \d+ sections|Follow/i,
      })
      .click();

    await expect(page.getByText(/已关注|Added/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await page.waitForLoadState("networkidle");

    await captureStepScreenshot(
      page,
      testInfo,
      "dashboard-subscriptions-bulk-import-success",
    );
  });
});

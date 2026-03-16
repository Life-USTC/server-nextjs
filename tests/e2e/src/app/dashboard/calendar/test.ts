import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { gotoAndWaitForReady } from "../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../utils/screenshot";

test("/?tab=calendar 未登录可访问", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/?tab=calendar");

  await expect(page).toHaveURL(/\/\?tab=calendar$/);
  await expect(page.locator("#main-content")).toBeVisible();
  await captureStepScreenshot(page, testInfo, "dashboard-calendar-unauthorized");
});

test("/?tab=calendar 登录后展示学期日历并可进入班级页", async ({
  page,
}, testInfo) => {
  await signInAsDebugUser(page, "/?tab=calendar");

  await expect(page.locator("#main-content")).toBeVisible();

  const sectionLink = page.locator('a[href^="/sections/"]').first();
  await expect(sectionLink).toBeVisible();
  await sectionLink.click();

  await expect(page).toHaveURL(/\/sections\/\d+/);
  await captureStepScreenshot(page, testInfo, "dashboard-calendar-section-link");
});

test("/?tab=calendar 考试卡片可跳转到 exams tab", async ({ page }, testInfo) => {
  await signInAsDebugUser(page, "/?tab=calendar");

  const examLink = page.locator('a[href="/?tab=exams"]').first();
  await expect(examLink).toBeVisible();
  await examLink.click();

  await expect(page).toHaveURL(/\/\?tab=exams$/);
  await captureStepScreenshot(page, testInfo, "dashboard-calendar-exams-link");
});

import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { gotoAndWaitForReady } from "../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../utils/screenshot";

test("/?tab=exams 未登录可访问", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/?tab=exams");

  await expect(page).toHaveURL(/\/\?tab=exams$/);
  await expect(page.locator("#main-content")).toBeVisible();
  await captureStepScreenshot(page, testInfo, "dashboard-exams-unauthorized");
});

test("/?tab=exams 登录后展示考试并支持筛选切换", async ({ page }, testInfo) => {
  await signInAsDebugUser(page, "/?tab=exams");

  const allFilter = page.getByRole("button", { name: /全部|All/i });
  await expect(allFilter).toBeVisible();
  await expect(page.locator('a[href^="/sections/"]').first()).toBeVisible();

  await allFilter.click();
  await expect(page.locator('a[href^="/sections/"]').first()).toBeVisible();
  await captureStepScreenshot(page, testInfo, "dashboard-exams-all");
});

test("/?tab=exams 可点击考试卡片跳转到班级详情", async ({ page }, testInfo) => {
  await signInAsDebugUser(page, "/?tab=exams");

  const sectionLink = page.locator('a[href^="/sections/"]').first();
  await expect(sectionLink).toBeVisible();
  await sectionLink.click();

  await expect(page).toHaveURL(/\/sections\/\d+/);
  await captureStepScreenshot(page, testInfo, "dashboard-exams-section-link");
});

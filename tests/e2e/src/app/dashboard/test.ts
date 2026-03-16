import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../utils/auth";
import { DEV_SEED } from "../../../utils/dev-seed";
import { gotoAndWaitForReady } from "../../../utils/page-ready";
import { captureStepScreenshot } from "../../../utils/screenshot";

test("/ 未登录访问 dashboard 参数时显示公开首页", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/?tab=homeworks", {
    expectMainContent: false,
  });

  await expect(page).toHaveURL(/\/\?tab=homeworks$/);
  await expect(page.locator('a[href="/sections"]').first()).toBeVisible();
  await captureStepScreenshot(page, testInfo, "home-public-with-tab");
});

test("/ 登录后展示 seed 作业入口", async ({ page }, testInfo) => {
  await signInAsDebugUser(page, "/");

  await expect(page).toHaveURL(/\/(?:\?.*)?$/);
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(page.getByText(DEV_SEED.homeworks.title).first()).toBeVisible();
  await captureStepScreenshot(page, testInfo, "dashboard-home");
});

test("/ 可点击作业 Tab 跳转到作业页", async ({ page }, testInfo) => {
  await signInAsDebugUser(page, "/");
  const homeworksTab = page
    .getByRole("link", { name: /作业|Homework|Homeworks/i })
    .first();
  await expect(homeworksTab).toBeVisible();
  await homeworksTab.click();
  await expect(page).toHaveURL(/tab=homeworks/);
  await captureStepScreenshot(page, testInfo, "dashboard-navigate-homeworks");
});

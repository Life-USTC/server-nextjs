import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../utils/auth";
import { DEV_SEED } from "../../../utils/dev-seed";
import { gotoAndWaitForReady } from "../../../utils/page-ready";
import { captureStepScreenshot } from "../../../utils/screenshot";

test("/dashboard 未登录重定向到登录页", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/dashboard", {
    expectMainContent: false,
  });

  await expect(page).toHaveURL(/\/signin(?:\?.*)?$/);
  await expect(page.getByRole("button", { name: /USTC/i })).toBeVisible();
  await captureStepScreenshot(page, testInfo, "dashboard-unauthorized");
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

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

test("/dashboard 登录后展示 seed 作业入口", async ({ page }, testInfo) => {
  await signInAsDebugUser(page, "/dashboard");

  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/);
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(page.getByTestId("dashboard-homeworks-entry")).toBeVisible();
  await expect(page.getByText(DEV_SEED.homeworks.title).first()).toBeVisible();
  await captureStepScreenshot(page, testInfo, "dashboard-home");
});

test("/dashboard 可点击作业入口跳转", async ({ page }, testInfo) => {
  await signInAsDebugUser(page, "/dashboard");
  const entry = page.getByTestId("dashboard-homeworks-entry");
  await expect(entry).toBeVisible();
  await entry.click();
  await expect(page).toHaveURL(/\/dashboard\/homeworks(?:\?.*)?$/);
  await captureStepScreenshot(page, testInfo, "dashboard-navigate-homeworks");
});

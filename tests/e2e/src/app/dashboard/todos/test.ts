import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { DEV_SEED } from "../../../../utils/dev-seed";
import { gotoAndWaitForReady } from "../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../utils/screenshot";

test("/?tab=todos 未登录可访问", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/?tab=todos");

  await expect(page).toHaveURL(/\/\?tab=todos$/);
  await expect(page.locator("#main-content")).toBeVisible();
  await captureStepScreenshot(page, testInfo, "dashboard-todos-unauthorized");
});

test("/?tab=todos 登录后展示 seed 待办", async ({ page }, testInfo) => {
  await signInAsDebugUser(page, "/?tab=todos");

  await expect(page.getByText(DEV_SEED.todos.dueTodayTitle).first()).toBeVisible();
  await captureStepScreenshot(page, testInfo, "dashboard-todos-seed");
});

test("/?tab=todos 可切换已完成筛选", async ({ page }, testInfo) => {
  await signInAsDebugUser(page, "/?tab=todos");

  await page.getByRole("button", { name: /已完成|Completed/i }).click();
  await expect(page.getByText(DEV_SEED.todos.completedTitle).first()).toBeVisible();
  await captureStepScreenshot(page, testInfo, "dashboard-todos-completed");
});

test("/?tab=todos 可创建并删除待办", async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await signInAsDebugUser(page, "/?tab=todos");

  const title = `e2e-dashboard-todo-${Date.now()}`;

  await page.getByRole("button", { name: /添加待办|Add Todo/i }).click();
  await page.getByLabel(/标题|Title/i).fill(title);
  await page.getByRole("button", { name: /创建待办|Create Todo/i }).click();

  await expect(page.getByText(title).first()).toBeVisible({ timeout: 15000 });
  await captureStepScreenshot(page, testInfo, "dashboard-todos-created");

  await page.getByText(title).first().click();
  await page.getByRole("button", { name: /删除待办|Delete todo/i }).click();
  await expect(page.getByText(title)).toHaveCount(0, {
    timeout: 15000,
  });
  await captureStepScreenshot(page, testInfo, "dashboard-todos-deleted");
});

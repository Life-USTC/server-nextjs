import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { DEV_SEED } from "../../../../utils/dev-seed";
import { gotoAndWaitForReady } from "../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../utils/screenshot";

test.describe.configure({ mode: "serial" });

test("/settings/profile 未登录重定向到登录页", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/settings/profile", {
    expectMainContent: false,
  });

  await expect(page).toHaveURL(/\/signin(?:\?.*)?$/);
  await expect(page.getByRole("button", { name: /USTC/i })).toBeVisible();
  await captureStepScreenshot(page, testInfo, "settings-profile-unauthorized");
});

test("/settings/profile 登录后展示 seed 用户资料", async ({
  page,
}, testInfo) => {
  await signInAsDebugUser(page, "/settings/profile");

  await expect(page).toHaveURL(/\/settings\/profile(?:\?.*)?$/);
  await expect(page.locator("input#name")).toHaveValue(DEV_SEED.debugName);
  await expect(page.locator("input#username")).toHaveValue(
    DEV_SEED.debugUsername,
  );
  await captureStepScreenshot(page, testInfo, "settings-profile-seed");
});

test("/settings/profile 可保存姓名并回滚", async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await signInAsDebugUser(page, "/settings/profile");

  const nameInput = page.locator("input#name");
  const originalName = await nameInput.inputValue();
  const newName = `e2e-${Date.now()}`;
  await nameInput.fill(newName);

  const saveResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/settings/profile") &&
      response.request().method() === "POST" &&
      response.status() === 200,
  );
  await page.getByRole("button", { name: /保存|Save/i }).click();
  await saveResponse;
  await page.waitForLoadState("networkidle");
  await captureStepScreenshot(page, testInfo, "settings-profile-saved");

  let persisted = false;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await gotoAndWaitForReady(page, "/settings/profile");
    const value = await page.locator("input#name").inputValue();
    if (value === newName) {
      persisted = true;
      break;
    }
    await page.waitForTimeout(300);
  }
  expect(persisted).toBe(true);

  await page.locator("input#name").fill(originalName);
  const rollbackResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/settings/profile") &&
      response.request().method() === "POST" &&
      response.status() === 200,
  );
  await page.getByRole("button", { name: /保存|Save/i }).click();
  await rollbackResponse;
  await page.waitForLoadState("networkidle");
});

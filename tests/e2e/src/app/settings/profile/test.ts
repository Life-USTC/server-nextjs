import { expect, test } from "@playwright/test";
import {
  expectPagePath,
  expectRequiresSignIn,
  signInAsDebugUser,
} from "../../../../utils/auth";
import { DEV_SEED } from "../../../../utils/dev-seed";
import { captureStepScreenshot } from "../../../../utils/screenshot";

test.describe.configure({ mode: "serial" });

test("/settings/profile 未登录重定向到登录页", async ({ page }, testInfo) => {
  await expectRequiresSignIn(page, "/settings/profile");
  await captureStepScreenshot(page, testInfo, "settings-profile-unauthorized");
});

test("/settings/profile 登录后展示 seed 用户资料", async ({
  page,
}, testInfo) => {
  await signInAsDebugUser(page, "/settings/profile");

  await expectPagePath(page, "/settings/profile");
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
  const saveButton = page.getByRole("button", { name: /保存|Save/i });
  const successToast = page.getByRole("heading", { name: /成功|Success/i });
  const originalName = await nameInput.inputValue();
  const newName = `e2e-${Date.now()}`;
  await nameInput.fill(newName);

  await saveButton.click();
  await expect(successToast).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.reload();
  await expect(page.locator("input#name")).toHaveValue(newName);
  await captureStepScreenshot(page, testInfo, "settings-profile-saved");

  await page.locator("input#name").fill(originalName);
  await saveButton.click();
  await expect(successToast).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.reload();
  await expect(page.locator("input#name")).toHaveValue(originalName);
});

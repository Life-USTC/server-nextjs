import { expect, test } from "@playwright/test";
import {
  expectPagePath,
  expectRequiresSignIn,
  signInAsDebugUser,
} from "../../../../utils/auth";
import { captureStepScreenshot } from "../../../../utils/screenshot";

test("/settings/danger 未登录重定向到登录页", async ({ page }, testInfo) => {
  await expectRequiresSignIn(page, "/settings/danger");
  await captureStepScreenshot(page, testInfo, "settings-danger-unauthorized");
});

test("/settings/danger 登录后展示删除确认交互", async ({ page }, testInfo) => {
  await signInAsDebugUser(page, "/settings/danger");

  await expectPagePath(page, "/settings/danger");
  const openDialogButton = page
    .getByRole("button", { name: /删除|Delete/i })
    .first();
  await expect(openDialogButton).toBeVisible();
  await expect(openDialogButton).toBeEnabled();
  await openDialogButton.click({ force: true });
  const input = page.locator('input[placeholder="DELETE"]').first();
  await expect(input).toBeVisible();

  const confirmButton = page
    .getByRole("button", { name: /删除|Delete/i })
    .last();
  await expect(confirmButton).toBeDisabled();
  await input.fill("DEL");
  await expect(confirmButton).toBeDisabled();
  await input.fill("DELETE");
  await expect(confirmButton).toBeEnabled();
  await captureStepScreenshot(
    page,
    testInfo,
    "settings-danger-confirm-enabled",
  );

  await page.getByRole("button", { name: /取消|Cancel/i }).click();
  await expect(input).not.toBeVisible();
});

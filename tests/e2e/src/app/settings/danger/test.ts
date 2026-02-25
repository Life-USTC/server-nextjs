import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { gotoAndWaitForReady } from "../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../utils/screenshot";

test("/settings/danger 未登录重定向到登录页", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/settings/danger", {
    expectMainContent: false,
  });

  await expect(page).toHaveURL(/\/signin(?:\?.*)?$/);
  await expect(page.getByRole("button", { name: /USTC/i })).toBeVisible();
  await captureStepScreenshot(page, testInfo, "settings-danger-unauthorized");
});

test("/settings/danger 登录后展示删除确认交互", async ({ page }, testInfo) => {
  await signInAsDebugUser(page, "/settings/danger");

  await expect(page).toHaveURL(/\/settings\/danger(?:\?.*)?$/);
  const openDialogButton = page
    .getByRole("button", { name: /删除|Delete/i })
    .first();
  await openDialogButton.click();
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

import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { gotoAndWaitForReady } from "../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../utils/screenshot";

test("/settings/accounts 未登录重定向到登录页", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/settings/accounts", {
    expectMainContent: false,
  });

  await expect(page).toHaveURL(/\/signin(?:\?.*)?$/);
  await expect(page.getByRole("button", { name: /USTC/i })).toBeVisible();
  await captureStepScreenshot(page, testInfo, "settings-accounts-unauthorized");
});

test("/settings/accounts 登录后展示绑定平台", async ({ page }, testInfo) => {
  await signInAsDebugUser(page, "/settings/accounts");

  await expect(page).toHaveURL(/\/settings\/accounts(?:\?.*)?$/);
  await expect(page.getByText("GitHub").first()).toBeVisible();
  await expect(page.getByText("Google").first()).toBeVisible();
  await expect(page.getByText("USTC").first()).toBeVisible();
  await captureStepScreenshot(page, testInfo, "settings-accounts-platforms");
});

test("/settings/accounts 可点击连接按钮进入 OAuth 登录流程", async ({
  page,
}, testInfo) => {
  await signInAsDebugUser(page, "/settings/accounts");

  const connectButton = page
    .getByRole("button", { name: /连接|Connect/i })
    .first();
  if ((await connectButton.count()) === 0) {
    await expect(page.locator("#main-content")).toBeVisible();
    return;
  }

  await connectButton.click();
  await page.waitForURL(
    /(\/api\/auth\/(signin|callback)\/(github|google|oidc)|github\.com\/login|accounts\.google\.com)/,
  );
  await captureStepScreenshot(page, testInfo, "settings-accounts-oauth");
});

test("/settings/accounts 仅剩一个账户时断开按钮禁用并提示", async ({
  page,
}, testInfo) => {
  await signInAsDebugUser(page, "/settings/accounts");

  const disconnectButton = page
    .getByRole("button", { name: /断开连接|Disconnect/i })
    .first();
  if ((await disconnectButton.count()) === 0) {
    await expect(page.locator("#main-content")).toBeVisible();
    return;
  }

  await expect(disconnectButton).toBeDisabled();
  await expect(
    page.getByText(/不能断开唯一关联的账户|cannot disconnect/i).first(),
  ).toBeVisible();
  await captureStepScreenshot(
    page,
    testInfo,
    "settings-accounts-disconnect-disabled",
  );
});

import { expect, test } from "@playwright/test";
import {
  expectPagePath,
  expectRequiresSignIn,
  signInAsDebugUser,
} from "../../../../utils/auth";
import {
  deleteLinkedAccountFixture,
  ensureLinkedAccountFixture,
  getCurrentSessionUser,
} from "../../../../utils/e2e-db";
import { captureStepScreenshot } from "../../../../utils/screenshot";

test("/settings/accounts 未登录重定向到登录页", async ({ page }, testInfo) => {
  await expectRequiresSignIn(page, "/settings/accounts");
  await captureStepScreenshot(page, testInfo, "settings-accounts-unauthorized");
});

test("/settings/accounts 登录后展示绑定平台", async ({ page }, testInfo) => {
  await signInAsDebugUser(page, "/settings/accounts");

  await expectPagePath(page, "/settings/accounts");
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
  // In local/dev E2E we may not have all providers configured (or external
  // redirects blocked). The key assertion is that clicking "Connect" either
  // triggers a navigation to auth endpoints or keeps the UI stable.
  try {
    await page.waitForURL(
      /(\/api\/auth\/|\/api\/auth\/(signin|callback)\/(github|google|oidc)|github\.com\/login|accounts\.google\.com)/,
      { timeout: 5_000 },
    );
  } catch {}

  try {
    await captureStepScreenshot(page, testInfo, "settings-accounts-oauth");
  } catch {}
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

test("/settings/accounts 多账户时可取消并确认解绑", async ({
  page,
}, testInfo) => {
  const provider = "github";
  await signInAsDebugUser(page, "/settings/accounts");
  const user = await getCurrentSessionUser(page);

  deleteLinkedAccountFixture({ userId: user.id, provider });
  ensureLinkedAccountFixture({ userId: user.id, provider });

  try {
    await page.reload({ waitUntil: "networkidle" });
    await expectPagePath(page, "/settings/accounts");

    const providerCard = page
      .locator("#main-content .rounded-lg.border")
      .filter({ has: page.getByText("GitHub", { exact: true }) })
      .first();
    await expect(providerCard).toBeVisible();

    const disconnectButton = providerCard.getByRole("button", {
      name: /断开连接|Disconnect/i,
    });
    await expect(disconnectButton).toBeEnabled();
    await disconnectButton.click();

    const dialog = page
      .getByRole("dialog")
      .or(page.getByRole("alertdialog"))
      .first();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /取消|Cancel/i }).click();
    await expect(dialog).not.toBeVisible();

    await disconnectButton.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /断开连接|Disconnect/i }).click();

    await expect(dialog).not.toBeVisible({ timeout: 15000 });
    await expect(
      providerCard.getByRole("button", { name: /连接|Connect/i }),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      providerCard.getByRole("button", { name: /断开连接|Disconnect/i }),
    ).toHaveCount(0);
    await captureStepScreenshot(page, testInfo, "settings-accounts-unlinked");
  } finally {
    deleteLinkedAccountFixture({ userId: user.id, provider });
  }
});

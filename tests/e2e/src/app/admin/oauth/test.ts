import { expect, test } from "@playwright/test";
import {
  expectRequiresSignIn,
  signInAsDebugUser,
  signInAsDevAdmin,
} from "../../../../utils/auth";
import {
  deleteOAuthClientsByName,
  PLAYWRIGHT_BASE_URL,
} from "../../../../utils/e2e-db";
import { captureStepScreenshot } from "../../../../utils/screenshot";

test("/admin/oauth 未登录重定向到登录页", async ({ page }, testInfo) => {
  await expectRequiresSignIn(page, "/admin/oauth");
  await captureStepScreenshot(page, testInfo, "admin-oauth-unauthorized");
});

test("/admin/oauth 普通用户访问返回 404", async ({ page }, testInfo) => {
  await signInAsDebugUser(page, "/admin/oauth", "/admin/oauth");
  await expect(page.locator("h1")).toHaveText("404");
  await captureStepScreenshot(page, testInfo, "admin-oauth-404");
});

test("/admin/oauth 管理员可创建并删除客户端", async ({ page }, testInfo) => {
  test.setTimeout(60000);
  const clientName = `e2e-oauth-client-${Date.now()}`;

  try {
    await signInAsDevAdmin(page, "/admin/oauth");

    await expect(
      page.getByRole("heading", { name: /OAuth 客户端管理|OAuth Clients/i }),
    ).toBeVisible();

    await page.getByLabel(/应用名称|Application Name/i).fill(clientName);
    await page
      .getByLabel(/重定向 URI|Redirect URIs/i)
      .fill(`${PLAYWRIGHT_BASE_URL}/oauth-e2e/callback`);

    await page
      .getByRole("button", { name: /创建客户端|Create Client/i })
      .click();

    await expect(page.getByText(clientName).first()).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.getByRole("button", { name: /复制 ID|Copy ID/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /复制密钥|Copy secret/i }).first(),
    ).toBeVisible();
    await expect(
      page
        .getByText(/Verify your identity|验证您的身份/i)
        .first(),
    ).toBeVisible();
    await expect(
      page
        .getByText(/Call MCP tools on your behalf|代表您调用 MCP 工具/i)
        .first(),
    ).toBeVisible();
    await captureStepScreenshot(page, testInfo, "admin-oauth-created");

    const row = page
      .locator("div.rounded-xl.border.p-4")
      .filter({ has: page.getByText(clientName, { exact: true }) })
      .first();
    await row.getByRole("button", { name: /删除|Delete/i }).click();

    await expect(page.getByText(clientName)).toHaveCount(0, {
      timeout: 15000,
    });
    await captureStepScreenshot(page, testInfo, "admin-oauth-deleted");
  } finally {
    deleteOAuthClientsByName(clientName);
  }
});

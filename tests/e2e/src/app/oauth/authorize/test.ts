import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import {
  createOAuthClientFixture,
  deleteOAuthClientFixture,
  findOAuthCodeByCode,
  PLAYWRIGHT_BASE_URL,
} from "../../../../utils/e2e-db";
import { gotoAndWaitForReady } from "../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../utils/screenshot";

function buildAuthorizeUrl(params: Record<string, string>) {
  return `/oauth/authorize?${new URLSearchParams(params).toString()}`;
}

function getPrimaryRedirectUri(client: { redirectUris: string[] }) {
  const redirectUri = client.redirectUris[0];
  if (typeof redirectUri !== "string") {
    throw new Error("Expected OAuth fixture client to include a redirect URI");
  }
  return redirectUri;
}

test("/oauth/authorize 未登录时重定向到登录页", async ({ page }, testInfo) => {
  const client = await createOAuthClientFixture();
  const redirectUri = getPrimaryRedirectUri(client);

  try {
    await gotoAndWaitForReady(
      page,
      buildAuthorizeUrl({
        client_id: client.clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid profile",
        state: "redirect-state",
      }),
      { expectMainContent: false },
    );

    await expect(page).toHaveURL(/\/signin\?callbackUrl=/);
    await captureStepScreenshot(page, testInfo, "oauth-authorize-redirect");
  } finally {
    await deleteOAuthClientFixture(client.id);
  }
});

test("/oauth/authorize 无效客户端展示错误", async ({ page }, testInfo) => {
  await signInAsDebugUser(page, "/");

  await gotoAndWaitForReady(
    page,
    buildAuthorizeUrl({
      client_id: "missing-client",
      redirect_uri: `${PLAYWRIGHT_BASE_URL}/oauth-e2e/callback`,
      response_type: "code",
    }),
    { waitUntil: "load" },
  );

  await expect(
    page.getByText(/无效客户端|Invalid client/i).first(),
  ).toBeVisible();
  await captureStepScreenshot(page, testInfo, "oauth-authorize-invalid-client");
});

test("/oauth/authorize 拒绝授权时带 error 回跳", async ({ page }, testInfo) => {
  const client = await createOAuthClientFixture();
  const redirectUri = getPrimaryRedirectUri(client);

  try {
    await signInAsDebugUser(page, "/");
    await gotoAndWaitForReady(
      page,
      buildAuthorizeUrl({
        client_id: client.clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid profile",
        state: "deny-state",
      }),
    );

    await page.getByRole("button", { name: /拒绝|Deny/i }).click();
    await expect(page).toHaveURL(/\/oauth-e2e\/callback\?/);

    const redirected = new URL(page.url());
    expect(redirected.searchParams.get("error")).toBe("access_denied");
    expect(redirected.searchParams.get("state")).toBe("deny-state");
    await captureStepScreenshot(page, testInfo, "oauth-authorize-denied");
  } finally {
    await deleteOAuthClientFixture(client.id);
  }
});

test("/oauth/authorize 允许授权时带 code 回跳", async ({ page }, testInfo) => {
  const client = await createOAuthClientFixture();
  const redirectUri = getPrimaryRedirectUri(client);

  try {
    await signInAsDebugUser(page, "/");
    await gotoAndWaitForReady(
      page,
      buildAuthorizeUrl({
        client_id: client.clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid profile",
        state: "allow-state",
      }),
    );

    await page.getByRole("button", { name: /允许|Allow/i }).click();
    await expect(page).toHaveURL(/\/oauth-e2e\/callback\?/);

    const redirected = new URL(page.url());
    const code = redirected.searchParams.get("code");
    expect(typeof code).toBe("string");
    expect(redirected.searchParams.get("state")).toBe("allow-state");

    const oauthCode = findOAuthCodeByCode(code ?? "");
    expect(oauthCode?.clientId).toBe(client.id);
    await captureStepScreenshot(page, testInfo, "oauth-authorize-allowed");
  } finally {
    await deleteOAuthClientFixture(client.id);
  }
});

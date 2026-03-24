import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../../utils/auth";
import {
  createOAuthClientFixture,
  deleteOAuthClientFixture,
} from "../../../../../utils/e2e-db";
import { assertApiContract } from "../../../_shared/api-contract";

test("/api/oauth/authorize", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/oauth/authorize" });
});

test("/api/oauth/authorize 未登录返回 401", async ({ request }) => {
  const response = await request.post("/api/oauth/authorize", {
    data: {
      client_id: "missing",
      redirect_uri: "http://localhost:3000/oauth-e2e/callback",
    },
  });
  expect(response.status()).toBe(401);
});

test("/api/oauth/authorize 登录后可签发授权码", async ({ page }) => {
  const client = await createOAuthClientFixture();

  try {
    await signInAsDebugUser(page, "/");

    const response = await page.request.post("/api/oauth/authorize", {
      data: {
        client_id: client.clientId,
        redirect_uri: client.redirectUris[0],
        scope: "openid profile",
        state: "api-authorize-state",
      },
    });
    expect(response.status()).toBe(200);

    const body = (await response.json()) as { redirect?: string };
    expect(body.redirect).toContain("/oauth-e2e/callback");
    const redirectUrl = new URL(body.redirect ?? "");
    expect(redirectUrl.searchParams.get("state")).toBe("api-authorize-state");
    expect(typeof redirectUrl.searchParams.get("code")).toBe("string");
  } finally {
    await deleteOAuthClientFixture(client.id);
  }
});

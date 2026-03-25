import { expect, test } from "@playwright/test";
import { generateCodeChallenge } from "@/lib/oauth/utils";
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
    const codeVerifier =
      "api-authorize-verifier-0123456789012345678901234567890123456789";

    const response = await page.request.post("/api/oauth/authorize", {
      data: {
        client_id: client.clientId,
        redirect_uri: client.redirectUris[0],
        scope: "openid profile",
        state: "api-authorize-state",
        code_challenge: generateCodeChallenge(codeVerifier),
        code_challenge_method: "S256",
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

test("/api/oauth/authorize GET 兼容入口会重定向到授权同意页", async ({
  page,
}) => {
  const client = await createOAuthClientFixture();

  try {
    await signInAsDebugUser(page, "/");

    const response = await page.request.get("/api/oauth/authorize", {
      params: {
        client_id: client.clientId,
        redirect_uri: client.redirectUris[0],
        response_type: "code",
        scope: "openid profile",
        state: "api-authorize-get-state",
        code_challenge: generateCodeChallenge(
          "api-authorize-get-verifier-0123456789012345678901234567890123456789",
        ),
        code_challenge_method: "S256",
      },
      maxRedirects: 0,
    });

    expect(response.status()).toBe(302);
    const location = response.headers().location;
    expect(typeof location).toBe("string");
    expect(location).toContain("/oauth/authorize?");
    expect(location).toContain("consent_code=");
  } finally {
    await deleteOAuthClientFixture(client.id);
  }
});

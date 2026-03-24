import { expect, type Page, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../../utils/auth";
import { DEV_SEED } from "../../../../../utils/dev-seed";
import {
  createOAuthClientFixture,
  deleteOAuthClientFixture,
} from "../../../../../utils/e2e-db";
import { assertApiContract } from "../../../_shared/api-contract";

async function issueAccessToken(
  page: Page,
  client: Awaited<ReturnType<typeof createOAuthClientFixture>>,
  scope = "openid profile",
) {
  const authorizeResponse = await page.request.post("/api/oauth/authorize", {
    data: {
      client_id: client.clientId,
      redirect_uri: client.redirectUris[0],
      scope,
    },
  });
  expect(authorizeResponse.status()).toBe(200);
  const redirect = ((await authorizeResponse.json()) as { redirect?: string })
    .redirect;
  const code = new URL(redirect ?? "").searchParams.get("code");
  expect(code).toBeTruthy();

  const headers =
    client.tokenEndpointAuthMethod === "client_secret_basic"
      ? {
          Authorization: `Basic ${Buffer.from(
            `${client.clientId}:${client.clientSecret}`,
          ).toString("base64")}`,
        }
      : undefined;
  const tokenResponse = await page.request.post("/api/oauth/token", {
    headers,
    data: {
      grant_type: "authorization_code",
      code,
      redirect_uri: client.redirectUris[0],
      ...(headers
        ? {}
        : {
            client_id: client.clientId,
            client_secret: client.clientSecret,
          }),
    },
  });
  expect(tokenResponse.status()).toBe(200);
  return ((await tokenResponse.json()) as { access_token?: string })
    .access_token as string;
}

test("/api/oauth/userinfo", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/oauth/userinfo" });
});

test("/api/oauth/userinfo openid+profile scope 返回用户信息", async ({
  page,
}) => {
  const client = await createOAuthClientFixture();

  try {
    await signInAsDebugUser(page, "/");
    const accessToken = await issueAccessToken(page, client);

    const response = await page.request.get("/api/oauth/userinfo", {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
    expect(response.status()).toBe(200);

    const body = (await response.json()) as {
      sub?: string;
      name?: string | null;
      preferred_username?: string | null;
    };
    expect(typeof body.sub).toBe("string");
    expect(body.name).toBe(DEV_SEED.debugName);
    expect(body.preferred_username).toBe(DEV_SEED.debugUsername);
  } finally {
    await deleteOAuthClientFixture(client.id);
  }
});

test("/api/oauth/userinfo 缺少 openid scope 返回 403", async ({ page }) => {
  const client = await createOAuthClientFixture();

  try {
    await signInAsDebugUser(page, "/");
    const accessToken = await issueAccessToken(page, client, "profile");

    const response = await page.request.get("/api/oauth/userinfo", {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
    expect(response.status()).toBe(403);
  } finally {
    await deleteOAuthClientFixture(client.id);
  }
});

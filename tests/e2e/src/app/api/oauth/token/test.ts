import { expect, type Page, test } from "@playwright/test";
import { generateCodeChallenge } from "@/lib/oauth/utils";
import { signInAsDebugUser } from "../../../../../utils/auth";
import {
  createOAuthClientFixture,
  deleteOAuthClientFixture,
} from "../../../../../utils/e2e-db";
import { assertApiContract } from "../../../_shared/api-contract";

const E2E_CODE_VERIFIER =
  "e2e-token-test-verifier-0123456789012345678901234567890123456789";

async function issueCode(
  page: Page,
  client: Awaited<ReturnType<typeof createOAuthClientFixture>>,
  scope = "openid profile",
) {
  const authorizeResponse = await page.request.post("/api/oauth/authorize", {
    data: {
      client_id: client.clientId,
      redirect_uri: client.redirectUris[0],
      scope,
      code_challenge: generateCodeChallenge(E2E_CODE_VERIFIER),
      code_challenge_method: "S256",
    },
  });
  expect(authorizeResponse.status()).toBe(200);
  const redirect = ((await authorizeResponse.json()) as { redirect?: string })
    .redirect;
  expect(redirect).toBeTruthy();
  return new URL(redirect ?? "").searchParams.get("code") as string;
}

test("/api/oauth/token", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/oauth/token" });
});

test("/api/oauth/token 可用授权码换取 access token", async ({ page }) => {
  const client = await createOAuthClientFixture();

  try {
    await signInAsDebugUser(page, "/");
    const code = await issueCode(page, client);

    const response = await page.request.post("/api/oauth/token", {
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${client.clientId}:${client.clientSecret}`,
        ).toString("base64")}`,
      },
      data: {
        grant_type: "authorization_code",
        code,
        code_verifier: E2E_CODE_VERIFIER,
        redirect_uri: client.redirectUris[0],
      },
    });
    expect(response.status()).toBe(200);

    const body = (await response.json()) as {
      access_token?: string;
      token_type?: string;
      scope?: string;
    };
    expect(typeof body.access_token).toBe("string");
    expect(body.token_type).toBe("Bearer");
    expect(body.scope).toBe("openid profile");
  } finally {
    await deleteOAuthClientFixture(client.id);
  }
});

test("/api/oauth/token client_secret_post 客户端必须使用请求体密钥", async ({
  page,
}) => {
  const client = await createOAuthClientFixture({
    tokenEndpointAuthMethod: "client_secret_post",
  });

  try {
    await signInAsDebugUser(page, "/");
    const code = await issueCode(page, client);

    const rejectedResponse = await page.request.post("/api/oauth/token", {
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${client.clientId}:${client.clientSecret}`,
        ).toString("base64")}`,
      },
      data: {
        grant_type: "authorization_code",
        code,
        code_verifier: E2E_CODE_VERIFIER,
        redirect_uri: client.redirectUris[0],
      },
    });
    expect(rejectedResponse.status()).toBe(401);
    expect(await rejectedResponse.json()).toEqual({ error: "invalid_client" });

    const freshCode = await issueCode(page, client);
    const acceptedResponse = await page.request.post("/api/oauth/token", {
      data: {
        grant_type: "authorization_code",
        client_id: client.clientId,
        client_secret: client.clientSecret,
        code: freshCode,
        code_verifier: E2E_CODE_VERIFIER,
        redirect_uri: client.redirectUris[0],
      },
    });
    expect(acceptedResponse.status()).toBe(200);

    const body = (await acceptedResponse.json()) as {
      access_token?: string;
      refresh_token?: string;
      token_type?: string;
    };
    expect(typeof body.access_token).toBe("string");
    expect(typeof body.refresh_token).toBe("string");
    expect(body.token_type).toBe("Bearer");
  } finally {
    await deleteOAuthClientFixture(client.id);
  }
});

import { expect, type Page, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../../utils/auth";
import {
  createOAuthClientFixture,
  deleteOAuthClientFixture,
} from "../../../../../utils/e2e-db";
import { assertApiContract } from "../../../_shared/api-contract";

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
      data: {
        grant_type: "authorization_code",
        code,
        redirect_uri: client.redirectUris[0],
        client_id: client.clientId,
        client_secret: client.clientSecret,
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

/**
 * E2E tests for OAuth 2.0 provider endpoints
 *
 * Tests the OAuth 2.0 / OpenID Connect infrastructure used for MCP authentication.
 * The actual dynamic client registration endpoint is at /api/auth/oauth2/register.
 *
 * - Well-known discovery endpoints:
 *   - /.well-known/oauth-authorization-server → authorization server metadata
 *   - /.well-known/openid-configuration → OpenID provider configuration
 *   - /.well-known/oauth-protected-resource → protected resource metadata
 * - Full PKCE authorization code flow:
 *   1. POST /api/auth/oauth2/register → dynamic client registration
 *   2. GET /api/auth/oauth2/authorize → redirect to consent page
 *   3. User grants consent → redirect with authorization code
 *   4. POST /api/auth/oauth2/token → exchange code for access token
 *   5. GET /api/auth/oauth2/userinfo → retrieve user claims
 */
import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../../utils/auth";
import { PLAYWRIGHT_BASE_URL } from "../../../../../utils/e2e-db";

function generateCodeChallenge(codeVerifier: string) {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}

const REDIRECT_URI = `${PLAYWRIGHT_BASE_URL}/e2e/oauth/callback`;
const RESOURCE = `${PLAYWRIGHT_BASE_URL}/api/mcp`;
const CODE_VERIFIER =
  "oauth-provider-e2e-verifier-0123456789012345678901234567890123456789";

test.describe("OAuth provider", () => {
  test("well-known endpoints are exposed at root", async ({ request }) => {
    const [authServer, openid, protectedResource] = await Promise.all([
      request.get("/.well-known/oauth-authorization-server"),
      request.get("/.well-known/openid-configuration"),
      request.get("/.well-known/oauth-protected-resource"),
    ]);

    expect(authServer.status()).toBe(200);
    expect(openid.status()).toBe(200);
    expect(protectedResource.status()).toBe(200);
  });

  test("dynamic registration + consent + code exchange + userinfo", async ({
    page,
    request,
  }) => {
    // Register a public client (no secret) for PKCE.
    const registrationResponse = await request.post(
      "/api/auth/oauth2/register",
      {
        data: {
          client_name: `e2e-public-${Date.now()}`,
          redirect_uris: [REDIRECT_URI],
          token_endpoint_auth_method: "none",
          grant_types: ["authorization_code"],
          response_types: ["code"],
          scope: "openid profile email mcp:tools",
        },
      },
    );
    expect(registrationResponse.status()).toBe(200);
    const registrationBody = (await registrationResponse.json()) as {
      client_id?: string;
      client_name?: string;
    };
    expect(typeof registrationBody.client_id).toBe("string");
    expect(registrationBody.client_name).toMatch(/^e2e-public-/);

    await signInAsDebugUser(page, "/");

    // Start authorize flow (will redirect to consent page).
    const authorizeResponse = await page.request.get(
      "/api/auth/oauth2/authorize",
      {
        params: {
          response_type: "code",
          client_id: registrationBody.client_id,
          redirect_uri: REDIRECT_URI,
          scope: "openid profile email mcp:tools",
          state: "e2e-state",
          prompt: "consent",
          code_challenge: generateCodeChallenge(CODE_VERIFIER),
          code_challenge_method: "S256",
          resource: RESOURCE,
        },
        maxRedirects: 0,
      },
    );
    expect(authorizeResponse.status()).toBe(302);
    const consentLocation = authorizeResponse.headers().location;
    expect(consentLocation).toContain("/oauth/authorize?");

    // Complete consent UI.
    await page.goto(consentLocation);
    await page.getByRole("button", { name: /allow/i }).click();
    await page.waitForURL("**/e2e/oauth/callback**");

    const callbackUrl = new URL(page.url());
    const code = callbackUrl.searchParams.get("code");
    expect(typeof code).toBe("string");

    // Exchange code for token.
    const tokenResponse = await request.post("/api/auth/oauth2/token", {
      form: {
        grant_type: "authorization_code",
        client_id: registrationBody.client_id,
        code,
        code_verifier: CODE_VERIFIER,
        redirect_uri: REDIRECT_URI,
        resource: RESOURCE,
      },
    });
    expect(tokenResponse.status()).toBe(200);
    const tokenBody = (await tokenResponse.json()) as {
      access_token?: string;
    };
    expect(typeof tokenBody.access_token).toBe("string");

    // Userinfo should return profile claims when openid scope exists.
    const userinfoResponse = await request.get("/api/auth/oauth2/userinfo", {
      headers: { authorization: `Bearer ${tokenBody.access_token}` },
    });
    expect(userinfoResponse.status()).toBe(200);
    const userinfoBody = (await userinfoResponse.json()) as { sub?: string };
    expect(typeof userinfoBody.sub).toBe("string");
  });
});

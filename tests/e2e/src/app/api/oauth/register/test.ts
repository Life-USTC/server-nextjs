import { expect, test } from "@playwright/test";
import { generateCodeChallenge } from "@/lib/oauth/utils";
import { signInAsDebugUser } from "../../../../../utils/auth";
import {
  deleteOAuthClientsByName,
  PLAYWRIGHT_BASE_URL,
} from "../../../../../utils/e2e-db";
import { assertApiContract } from "../../../_shared/api-contract";

test("/api/oauth/register", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/oauth/register" });
});

test("/api/oauth/register 可注册公共客户端并完成 PKCE 换取 token", async ({
  page,
  request,
}) => {
  const clientName = `codex-dcr-e2e-${Date.now()}`;
  const redirectUri = `${PLAYWRIGHT_BASE_URL}/oauth-e2e/callback`;
  const resource = `${PLAYWRIGHT_BASE_URL}/api/mcp`;

  try {
    const registrationResponse = await request.post("/api/oauth/register", {
      data: {
        client_name: clientName,
        redirect_uris: [redirectUri],
        grant_types: ["authorization_code"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
        scope: "openid profile mcp:tools",
      },
    });

    expect(registrationResponse.status()).toBe(201);
    const registrationBody = (await registrationResponse.json()) as {
      client_id?: string;
      scope?: string;
      token_endpoint_auth_method?: string;
      redirect_uris?: string[];
    };
    expect(typeof registrationBody.client_id).toBe("string");
    expect(registrationBody.scope).toBe("openid profile mcp:tools");
    expect(registrationBody.token_endpoint_auth_method).toBe("none");
    expect(registrationBody.redirect_uris).toEqual([redirectUri]);

    await signInAsDebugUser(page, "/");

    const codeVerifier =
      "codex-dcr-verifier-0123456789012345678901234567890123456789";
    const authorizeResponse = await page.request.post("/api/oauth/authorize", {
      data: {
        client_id: registrationBody.client_id,
        redirect_uri: redirectUri,
        scope: "openid profile mcp:tools",
        code_challenge: generateCodeChallenge(codeVerifier),
        code_challenge_method: "S256",
        resource,
      },
    });
    expect(authorizeResponse.status()).toBe(200);

    const authorizeBody = (await authorizeResponse.json()) as {
      redirect?: string;
    };
    const code = new URL(authorizeBody.redirect ?? "").searchParams.get("code");
    expect(typeof code).toBe("string");

    const tokenResponse = await request.post("/api/oauth/token", {
      data: {
        grant_type: "authorization_code",
        client_id: registrationBody.client_id,
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
        resource,
      },
    });
    expect(tokenResponse.status()).toBe(200);

    const tokenBody = (await tokenResponse.json()) as {
      access_token?: string;
      scope?: string;
    };
    expect(typeof tokenBody.access_token).toBe("string");
    expect(tokenBody.scope).toBe("openid profile mcp:tools");
  } finally {
    deleteOAuthClientsByName(clientName);
  }
});

test("/api/oauth/register 可注册 confidential client 并使用 client_secret 换取 token", async ({
  page,
  request,
}) => {
  const clientName = `connector-dcr-e2e-${Date.now()}`;
  const redirectUri = "https://chat.openai.com/aip/test/oauth/callback";

  try {
    const registrationResponse = await request.post("/api/oauth/register", {
      data: {
        client_name: clientName,
        redirect_uris: [redirectUri],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "client_secret_basic",
        scope: "openid profile mcp:tools",
      },
    });

    expect(registrationResponse.status()).toBe(201);
    const registrationBody = (await registrationResponse.json()) as {
      client_id?: string;
      client_secret?: string;
      grant_types?: string[];
      token_endpoint_auth_method?: string;
      redirect_uris?: string[];
      scope?: string;
    };
    expect(typeof registrationBody.client_id).toBe("string");
    expect(typeof registrationBody.client_secret).toBe("string");
    expect(registrationBody.grant_types).toEqual(["authorization_code"]);
    expect(registrationBody.token_endpoint_auth_method).toBe(
      "client_secret_basic",
    );
    expect(registrationBody.redirect_uris).toEqual([redirectUri]);
    expect(registrationBody.scope).toBe("openid profile mcp:tools");

    await signInAsDebugUser(page, "/");

    const authorizeResponse = await page.request.post("/api/oauth/authorize", {
      data: {
        client_id: registrationBody.client_id,
        redirect_uri: redirectUri,
        scope: "openid profile mcp:tools",
      },
    });
    expect(authorizeResponse.status()).toBe(200);

    const authorizeBody = (await authorizeResponse.json()) as {
      redirect?: string;
    };
    const code = new URL(authorizeBody.redirect ?? "").searchParams.get("code");
    expect(typeof code).toBe("string");

    const tokenResponse = await request.post("/api/oauth/token", {
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${registrationBody.client_id}:${registrationBody.client_secret}`,
        ).toString("base64")}`,
      },
      data: {
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      },
    });
    expect(tokenResponse.status()).toBe(200);

    const tokenBody = (await tokenResponse.json()) as {
      access_token?: string;
      scope?: string;
    };
    expect(typeof tokenBody.access_token).toBe("string");
    expect(tokenBody.scope).toBe("openid profile mcp:tools");
  } finally {
    deleteOAuthClientsByName(clientName);
  }
});

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

test("OAuth authorization-server metadata advertises dynamic registration and refresh tokens", async ({
  request,
}) => {
  const response = await request.get("/.well-known/oauth-authorization-server");

  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    client_id_metadata_document_supported?: boolean;
    registration_endpoint?: string;
    grant_types_supported?: string[];
  };
  expect(body.client_id_metadata_document_supported).toBe(false);
  expect(body.registration_endpoint).toContain("/api/oauth/register");
  expect(body.grant_types_supported).toEqual([
    "authorization_code",
    "refresh_token",
  ]);
});

test("OpenID discovery metadata advertises OAuth and userinfo endpoints", async ({
  request,
}) => {
  const response = await request.get("/.well-known/openid-configuration");

  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    authorization_endpoint?: string;
    client_id_metadata_document_supported?: boolean;
    token_endpoint?: string;
    registration_endpoint?: string;
    userinfo_endpoint?: string;
    grant_types_supported?: string[];
  };
  expect(body.authorization_endpoint).toContain("/oauth/authorize");
  expect(body.client_id_metadata_document_supported).toBe(false);
  expect(body.token_endpoint).toContain("/api/oauth/token");
  expect(body.registration_endpoint).toContain("/api/oauth/register");
  expect(body.userinfo_endpoint).toContain("/api/oauth/userinfo");
  expect(body.grant_types_supported).toEqual([
    "authorization_code",
    "refresh_token",
  ]);
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

test("/api/oauth/register 允许为公共客户端注册 refresh_token", async ({
  request,
}) => {
  const clientName = `public-refresh-${Date.now()}`;
  const redirectUri = `${PLAYWRIGHT_BASE_URL}/oauth-e2e/callback`;

  try {
    const response = await request.post("/api/oauth/register", {
      data: {
        client_name: clientName,
        redirect_uris: [redirectUri],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
        scope: "openid profile mcp:tools",
      },
    });

    expect(response.status()).toBe(201);

    const body = (await response.json()) as {
      client_id?: string;
      grant_types?: string[];
      token_endpoint_auth_method?: string;
      redirect_uris?: string[];
      scope?: string;
      client_secret?: unknown;
    };

    expect(typeof body.client_id).toBe("string");
    expect(body.redirect_uris).toEqual([redirectUri]);
    expect(body.grant_types).toEqual(["authorization_code", "refresh_token"]);
    expect(body.token_endpoint_auth_method).toBe("none");
    expect(body.scope).toBe("openid profile mcp:tools");
    // 公共客户端不会返回 client_secret
    expect(body.client_secret).toBeUndefined();
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
  const resource = `${PLAYWRIGHT_BASE_URL}/api/mcp`;

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
    expect(registrationBody.grant_types).toEqual([
      "authorization_code",
      "refresh_token",
    ]);
    expect(registrationBody.token_endpoint_auth_method).toBe(
      "client_secret_basic",
    );
    expect(registrationBody.redirect_uris).toEqual([redirectUri]);
    expect(registrationBody.scope).toBe("openid profile mcp:tools");

    await signInAsDebugUser(page, "/");
    const codeVerifier =
      "connector-dcr-verifier-0123456789012345678901234567890123456789";

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
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${registrationBody.client_id}:${registrationBody.client_secret}`,
        ).toString("base64")}`,
      },
      data: {
        grant_type: "authorization_code",
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
        resource,
      },
    });
    expect(tokenResponse.status()).toBe(200);

    const tokenBody = (await tokenResponse.json()) as {
      access_token?: string;
      refresh_token?: string;
      scope?: string;
    };
    expect(typeof tokenBody.access_token).toBe("string");
    expect(typeof tokenBody.refresh_token).toBe("string");
    expect(tokenBody.scope).toBe("openid profile mcp:tools");

    const refreshResponse = await request.post("/api/oauth/token", {
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${registrationBody.client_id}:${registrationBody.client_secret}`,
        ).toString("base64")}`,
      },
      data: {
        grant_type: "refresh_token",
        refresh_token: tokenBody.refresh_token,
        scope: "openid profile",
        resource,
      },
    });
    expect(refreshResponse.status()).toBe(200);

    const refreshBody = (await refreshResponse.json()) as {
      access_token?: string;
      refresh_token?: string;
      scope?: string;
    };
    expect(typeof refreshBody.access_token).toBe("string");
    expect(typeof refreshBody.refresh_token).toBe("string");
    expect(refreshBody.scope).toBe("openid profile");
  } finally {
    deleteOAuthClientsByName(clientName);
  }
});

test("/api/oauth/register 拒绝包含逗号的 redirect_uri", async ({ request }) => {
  const clientName = `redirect-comma-${Date.now()}`;
  const primaryRedirectUri = `${PLAYWRIGHT_BASE_URL}/oauth-e2e/callback,${PLAYWRIGHT_BASE_URL}/oauth-e2e/embedded`;

  const registrationResponse = await request.post("/api/oauth/register", {
    data: {
      client_name: clientName,
      redirect_uris: [primaryRedirectUri],
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: "openid profile",
    },
  });

  expect(registrationResponse.status()).toBe(400);
  await expect(registrationResponse.json()).resolves.toEqual({
    error: "invalid_client_metadata",
    error_description: "Redirect URIs must not contain commas",
  });
});

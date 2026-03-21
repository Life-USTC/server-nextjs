import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, prismaMock, revalidatePathMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  prismaMock: {
    $transaction: vi.fn(),
    user: {
      findUnique: vi.fn(),
    },
    oAuthClient: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    oAuthCode: {
      create: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
    oAuthAccessToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import { createOAuthClient } from "@/app/actions/oauth";
import { POST as authorize } from "@/app/api/oauth/authorize/route";
import { POST as register } from "@/app/api/oauth/register/route";
import { POST as token } from "@/app/api/oauth/token/route";
import { GET as userinfo } from "@/app/api/oauth/userinfo/route";
import {
  generateCodeChallenge,
  hashOAuthClientSecret,
  verifyOAuthClientSecret,
} from "@/lib/oauth/utils";

describe("oauth routes", () => {
  beforeEach(() => {
    authMock.mockReset();
    revalidatePathMock.mockReset();
    prismaMock.$transaction.mockReset();
    prismaMock.user.findUnique.mockReset();
    prismaMock.oAuthClient.findUnique.mockReset();
    prismaMock.oAuthClient.create.mockReset();
    prismaMock.oAuthCode.create.mockReset();
    prismaMock.oAuthCode.findUnique.mockReset();
    prismaMock.oAuthCode.deleteMany.mockReset();
    prismaMock.oAuthAccessToken.create.mockReset();
    prismaMock.oAuthAccessToken.findUnique.mockReset();
    prismaMock.oAuthAccessToken.delete.mockReset();
    prismaMock.oAuthAccessToken.deleteMany.mockReset();
  });

  it("trims requested scopes to the client's registered scopes", async () => {
    authMock.mockResolvedValue({
      user: { id: "user-1" },
    });
    prismaMock.oAuthClient.findUnique.mockResolvedValue({
      id: "client-db-id",
      redirectUris: ["https://client.example/callback"],
      scopes: ["openid"],
      tokenEndpointAuthMethod: "client_secret_basic",
    });
    prismaMock.oAuthCode.create.mockResolvedValue({});

    const request = new Request("http://localhost/api/oauth/authorize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_id: "client-id",
        redirect_uri: "https://client.example/callback",
        scope: "openid profile",
        state: "test-state",
      }),
    });

    const response = await authorize(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(prismaMock.oAuthCode.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.oAuthCode.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: "client-db-id",
        userId: "user-1",
        redirectUri: "https://client.example/callback",
        scopes: ["openid"],
      }),
    });
    expect(body.redirect).toContain("code=");
    expect(body.redirect).toContain("state=test-state");
  });

  it("rejects userinfo requests when the token lacks openid scope", async () => {
    prismaMock.oAuthAccessToken.findUnique.mockResolvedValue({
      id: "token-1",
      expiresAt: new Date(Date.now() + 60_000),
      scopes: ["profile"],
      user: {
        id: "user-1",
        name: "Test User",
        username: "tester",
        image: "https://example.com/avatar.png",
      },
    });

    const request = new Request("http://localhost/api/oauth/userinfo", {
      headers: { authorization: "Bearer valid-token" },
    });

    const response = await userinfo(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "insufficient_scope" });
    expect(response.headers.get("WWW-Authenticate")).toBe(
      'Bearer error="insufficient_scope"',
    );
  });

  it("hashes OAuth client secrets before persisting them", async () => {
    authMock.mockResolvedValue({
      user: { id: "admin-user" },
    });
    prismaMock.user.findUnique.mockResolvedValue({ isAdmin: true });
    prismaMock.oAuthClient.create.mockResolvedValue({});

    const formData = new FormData();
    formData.set("name", "Test Client");
    formData.set("redirectUris", "https://client.example/callback");

    const result = await createOAuthClient(formData);
    const storedSecret =
      prismaMock.oAuthClient.create.mock.calls[0][0].data.clientSecret;

    if (
      !("clientSecret" in result) ||
      typeof result.clientSecret !== "string"
    ) {
      throw new Error(
        "Expected OAuth client creation to return a clientSecret",
      );
    }

    expect(result).toMatchObject({
      success: true,
      clientId: expect.any(String),
      clientSecret: expect.any(String),
    });
    expect(storedSecret).not.toBe(result.clientSecret);
    await expect(
      verifyOAuthClientSecret(result.clientSecret, storedSecret),
    ).resolves.toBe(true);
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/oauth");
  });

  it("rejects unsafe redirect URI schemes during client registration", async () => {
    authMock.mockResolvedValue({
      user: { id: "admin-user" },
    });
    prismaMock.user.findUnique.mockResolvedValue({ isAdmin: true });

    const formData = new FormData();
    formData.set("name", "Unsafe Client");
    formData.set("redirectUris", "javascript:alert(1)");

    const result = await createOAuthClient(formData);

    expect(result).toEqual({
      error:
        "Redirect URIs must use https, or http only for localhost/127.0.0.1",
    });
    expect(prismaMock.oAuthClient.create).not.toHaveBeenCalled();
  });

  it("creates public OAuth clients without issuing a secret", async () => {
    authMock.mockResolvedValue({
      user: { id: "admin-user" },
    });
    prismaMock.user.findUnique.mockResolvedValue({ isAdmin: true });
    prismaMock.oAuthClient.create.mockResolvedValue({});

    const formData = new FormData();
    formData.set("name", "Public Client");
    formData.set("redirectUris", "https://client.example/callback");
    formData.set("tokenEndpointAuthMethod", "none");
    formData.set("enableMcp", "true");

    const result = await createOAuthClient(formData);

    expect(result).toMatchObject({
      success: true,
      clientId: expect.any(String),
      clientSecret: null,
    });
    expect(prismaMock.oAuthClient.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientSecret: null,
        tokenEndpointAuthMethod: "none",
        scopes: ["openid", "profile", "mcp:tools"],
      }),
    });
  });

  it("registers dynamic public OAuth clients for PKCE", async () => {
    prismaMock.oAuthClient.create.mockResolvedValue({});

    const request = new Request("http://localhost/api/oauth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_name: "Codex MCP Client",
        redirect_uris: ["http://127.0.0.1:9876/callback"],
        grant_types: ["authorization_code"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
        scope: "openid profile mcp:tools",
      }),
    });

    const response = await register(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      client_id: expect.any(String),
      client_name: "Codex MCP Client",
      redirect_uris: ["http://127.0.0.1:9876/callback"],
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: "openid profile mcp:tools",
    });
    expect(prismaMock.oAuthClient.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientSecret: null,
        tokenEndpointAuthMethod: "none",
        name: "Codex MCP Client",
        redirectUris: ["http://127.0.0.1:9876/callback"],
        scopes: ["openid", "profile", "mcp:tools"],
      }),
    });
  });

  it("rejects invalid redirect URIs during dynamic registration", async () => {
    const request = new Request("http://localhost/api/oauth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_name: "Bad Client",
        redirect_uris: ["http://example.com/callback"],
        token_endpoint_auth_method: "none",
      }),
    });

    const response = await register(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: "invalid_client_metadata",
      error_description:
        "Redirect URIs must use https, or http only for localhost/127.0.0.1",
    });
    expect(prismaMock.oAuthClient.create).not.toHaveBeenCalled();
  });

  it("requires redirect_uri when exchanging authorization codes", async () => {
    prismaMock.oAuthClient.findUnique.mockResolvedValue({
      id: "client-db-id",
      clientSecret: await hashOAuthClientSecret("top-secret"),
      tokenEndpointAuthMethod: "client_secret_basic",
    });

    const request = new Request("http://localhost/api/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: "client-id",
        client_secret: "top-secret",
        code: "auth-code",
      }),
    });

    const response = await token(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "invalid_request" });
    expect(prismaMock.oAuthCode.findUnique).not.toHaveBeenCalled();
  });

  it("returns invalid_request for malformed non-form token requests", async () => {
    const request = new Request("http://localhost/api/oauth/token", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "not-form-data",
    });

    const response = await token(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "invalid_request" });
    expect(prismaMock.oAuthClient.findUnique).not.toHaveBeenCalled();
  });

  it("returns invalid_grant instead of throwing when a code is already consumed", async () => {
    prismaMock.oAuthClient.findUnique.mockResolvedValue({
      id: "client-db-id",
      clientSecret: await hashOAuthClientSecret("top-secret"),
      tokenEndpointAuthMethod: "client_secret_basic",
    });
    prismaMock.oAuthCode.findUnique.mockResolvedValue({
      id: "code-db-id",
      clientId: "client-db-id",
      redirectUri: "https://client.example/callback",
      expiresAt: new Date(Date.now() + 60_000),
      scopes: ["openid"],
      userId: "user-1",
      codeChallenge: null,
      codeChallengeMethod: null,
      resource: null,
    });
    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback({
        oAuthCode: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        oAuthAccessToken: {
          create: vi.fn(),
        },
      }),
    );

    const request = new Request("http://localhost/api/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: "client-id",
        client_secret: "top-secret",
        code: "auth-code",
        redirect_uri: "https://client.example/callback",
      }),
    });

    const response = await token(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "invalid_grant" });
  });

  it("supports public clients using PKCE", async () => {
    const codeVerifier =
      "public-client-verifier-012345678901234567890123456789";

    prismaMock.oAuthClient.findUnique.mockResolvedValue({
      id: "client-db-id",
      clientSecret: null,
      tokenEndpointAuthMethod: "none",
    });
    prismaMock.oAuthCode.findUnique.mockResolvedValue({
      id: "code-db-id",
      clientId: "client-db-id",
      redirectUri: "https://client.example/callback",
      expiresAt: new Date(Date.now() + 60_000),
      scopes: ["openid", "mcp:tools"],
      userId: "user-1",
      codeChallenge: generateCodeChallenge(codeVerifier),
      codeChallengeMethod: "S256",
      resource: "http://localhost/api/mcp",
    });
    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback({
        oAuthCode: {
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        oAuthAccessToken: {
          create: vi.fn(),
        },
      }),
    );

    const request = new Request("http://localhost/api/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: "public-client-id",
        code: "auth-code",
        code_verifier: codeVerifier,
        redirect_uri: "https://client.example/callback",
        resource: "http://localhost/api/mcp",
      }),
    });

    const response = await token(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      access_token: expect.any(String),
      token_type: "Bearer",
      scope: "openid mcp:tools",
    });
  });

  it("cleans up expired access tokens without throwing on concurrent requests", async () => {
    prismaMock.oAuthAccessToken.findUnique.mockResolvedValue({
      id: "expired-token-id",
      expiresAt: new Date(Date.now() - 60_000),
      scopes: ["openid"],
      user: {
        id: "user-1",
        name: "Test User",
        username: "tester",
        image: "https://example.com/avatar.png",
      },
    });
    prismaMock.oAuthAccessToken.deleteMany.mockResolvedValue({ count: 0 });

    const request = new Request("http://localhost/api/oauth/userinfo", {
      headers: { authorization: "Bearer expired-token" },
    });

    const response = await userinfo(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "invalid_token" });
    expect(prismaMock.oAuthAccessToken.deleteMany).toHaveBeenCalledWith({
      where: { id: "expired-token-id" },
    });
  });
});

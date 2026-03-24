import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    oAuthRefreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
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

import { GET as oauthAuthorizationServerMetadata } from "@/app/.well-known/oauth-authorization-server/route";
import { createOAuthClient } from "@/app/actions/oauth";
import { POST as authorize } from "@/app/api/oauth/authorize/route";
import { POST as register } from "@/app/api/oauth/register/route";
import { POST as token } from "@/app/api/oauth/token/route";
import { GET as userinfo } from "@/app/api/oauth/userinfo/route";
import { authenticateMcpRequest } from "@/lib/mcp/auth";
import {
  generateCodeChallenge,
  hashOAuthClientSecret,
  hashOAuthRefreshToken,
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
    prismaMock.oAuthRefreshToken.create.mockReset();
    prismaMock.oAuthRefreshToken.findUnique.mockReset();
    prismaMock.oAuthRefreshToken.deleteMany.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
        grantTypes: ["authorization_code"],
        scopes: ["openid", "profile", "mcp:tools"],
      }),
    });
  });

  it("creates clients with fine-grained scopes and client_secret_post", async () => {
    authMock.mockResolvedValue({
      user: { id: "admin-user" },
    });
    prismaMock.user.findUnique.mockResolvedValue({ isAdmin: true });
    prismaMock.oAuthClient.create.mockResolvedValue({});

    const formData = new FormData();
    formData.set("name", "Post Client");
    formData.set("redirectUris", "https://client.example/callback");
    formData.set("tokenEndpointAuthMethod", "client_secret_post");
    formData.append("scopes", "openid");
    formData.append("scopes", "mcp:tools");

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

    expect(prismaMock.oAuthClient.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tokenEndpointAuthMethod: "client_secret_post",
        grantTypes: ["authorization_code", "refresh_token"],
        scopes: ["openid", "mcp:tools"],
      }),
    });
    await expect(
      verifyOAuthClientSecret(result.clientSecret, storedSecret),
    ).resolves.toBe(true);
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
        grantTypes: ["authorization_code"],
        scopes: ["openid", "profile", "mcp:tools"],
      }),
    });
  });

  it("rejects refresh_token grant registration for public dynamic clients", async () => {
    const request = new Request("http://localhost/api/oauth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_name: "Public Refresh Client",
        redirect_uris: ["http://127.0.0.1:9876/callback"],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
        scope: "openid profile mcp:tools",
      }),
    });

    const response = await register(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: "invalid_client_metadata",
      error_description:
        'Public dynamic clients may only register "authorization_code" grant_types',
    });
    expect(prismaMock.oAuthClient.create).not.toHaveBeenCalled();
  });

  it("registers dynamic confidential OAuth clients and hashes the secret", async () => {
    prismaMock.oAuthClient.create.mockResolvedValue({});

    const request = new Request("http://localhost/api/oauth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_name: "Connector Client",
        redirect_uris: ["https://chat.openai.com/aip/test/oauth/callback"],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "client_secret_basic",
        scope: "openid profile mcp:tools",
      }),
    });

    const response = await register(request);
    const body = await response.json();
    const storedSecret =
      prismaMock.oAuthClient.create.mock.calls[0][0].data.clientSecret;

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      client_id: expect.any(String),
      client_name: "Connector Client",
      redirect_uris: ["https://chat.openai.com/aip/test/oauth/callback"],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "client_secret_basic",
      client_secret: expect.any(String),
      client_secret_expires_at: 0,
      scope: "openid profile mcp:tools",
    });
    expect(storedSecret).not.toBe(body.client_secret);
    await expect(
      verifyOAuthClientSecret(body.client_secret, storedSecret),
    ).resolves.toBe(true);
  });

  it("advertises client_id metadata document support", async () => {
    const response = await oauthAuthorizationServerMetadata(
      new Request("http://localhost/.well-known/oauth-authorization-server"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.client_id_metadata_document_supported).toBe(true);
  });

  it("accepts URL client_ids backed by metadata documents", async () => {
    authMock.mockResolvedValue({
      user: { id: "user-1" },
    });
    prismaMock.oAuthClient.findUnique.mockResolvedValueOnce(null);
    prismaMock.oAuthClient.create.mockResolvedValue({
      id: "client-db-id",
      clientId: "https://client.example.com/.well-known/oauth-client.json",
      clientSecret: null,
      tokenEndpointAuthMethod: "none",
      name: "Metadata Client",
      redirectUris: ["http://127.0.0.1:8787/callback"],
      grantTypes: ["authorization_code"],
      scopes: ["openid", "profile", "mcp:tools"],
    });
    prismaMock.oAuthCode.create.mockResolvedValue({});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          client_id: "https://client.example.com/.well-known/oauth-client.json",
          client_name: "Metadata Client",
          redirect_uris: ["http://127.0.0.1:8787/callback"],
          grant_types: ["authorization_code"],
          response_types: ["code"],
          token_endpoint_auth_method: "none",
          scope: "openid profile mcp:tools",
        }),
      }),
    );

    const request = new Request("http://localhost/api/oauth/authorize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_id: "https://client.example.com/.well-known/oauth-client.json",
        redirect_uri: "http://127.0.0.1:8787/callback",
        scope: "openid profile mcp:tools",
        code_challenge: generateCodeChallenge(
          "metadata-client-verifier-012345678901234567890123456789",
        ),
        code_challenge_method: "S256",
        resource: "http://localhost/api/mcp",
      }),
    });

    const response = await authorize(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.redirect).toContain("code=");
    expect(prismaMock.oAuthClient.create).toHaveBeenCalledWith({
      data: {
        clientId: "https://client.example.com/.well-known/oauth-client.json",
        clientSecret: null,
        tokenEndpointAuthMethod: "none",
        name: "Metadata Client",
        redirectUris: ["http://127.0.0.1:8787/callback"],
        grantTypes: ["authorization_code"],
        scopes: ["openid", "profile", "mcp:tools"],
      },
      select: expect.any(Object),
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
      tokenEndpointAuthMethod: "client_secret_post",
      grantTypes: ["authorization_code", "refresh_token"],
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
      tokenEndpointAuthMethod: "client_secret_post",
      grantTypes: ["authorization_code", "refresh_token"],
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

  it("rejects HTTP Basic for client_secret_post clients", async () => {
    prismaMock.oAuthClient.findUnique.mockResolvedValue({
      id: "client-db-id",
      clientSecret: await hashOAuthClientSecret("top-secret"),
      tokenEndpointAuthMethod: "client_secret_post",
      grantTypes: ["authorization_code", "refresh_token"],
    });

    const request = new Request("http://localhost/api/oauth/token", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Basic ${Buffer.from("client-id:top-secret").toString("base64")}`,
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code: "auth-code",
        redirect_uri: "https://client.example/callback",
      }),
    });

    const response = await token(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "invalid_client" });
    expect(prismaMock.oAuthCode.findUnique).not.toHaveBeenCalled();
  });

  it("supports public clients using PKCE", async () => {
    const codeVerifier =
      "public-client-verifier-012345678901234567890123456789";

    prismaMock.oAuthClient.findUnique.mockResolvedValue({
      id: "client-db-id",
      clientSecret: null,
      tokenEndpointAuthMethod: "none",
      grantTypes: ["authorization_code"],
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

  it("rejects mcp-scoped code exchange when resource is omitted", async () => {
    const codeVerifier =
      "public-client-verifier-012345678901234567890123456789";

    prismaMock.oAuthClient.findUnique.mockResolvedValue({
      id: "client-db-id",
      clientId: "public-client-id",
      clientSecret: null,
      tokenEndpointAuthMethod: "none",
      grantTypes: ["authorization_code"],
      name: "Public Client",
      redirectUris: ["https://client.example/callback"],
      scopes: ["openid", "mcp:tools"],
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

    const request = new Request("http://localhost/api/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: "public-client-id",
        code: "auth-code",
        code_verifier: codeVerifier,
        redirect_uri: "https://client.example/callback",
      }),
    });

    const response = await token(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "invalid_target" });
  });

  it("issues refresh tokens when the client supports refresh_token", async () => {
    prismaMock.oAuthClient.findUnique.mockResolvedValue({
      id: "client-db-id",
      clientSecret: await hashOAuthClientSecret("top-secret"),
      tokenEndpointAuthMethod: "client_secret_post",
      grantTypes: ["authorization_code", "refresh_token"],
    });
    prismaMock.oAuthCode.findUnique.mockResolvedValue({
      id: "code-db-id",
      clientId: "client-db-id",
      redirectUri: "https://client.example/callback",
      expiresAt: new Date(Date.now() + 60_000),
      scopes: ["openid", "profile"],
      userId: "user-1",
      codeChallenge: null,
      codeChallengeMethod: null,
      resource: null,
    });
    const createRefreshTokenMock = vi.fn();
    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback({
        oAuthCode: {
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        oAuthAccessToken: {
          create: vi.fn(),
        },
        oAuthRefreshToken: {
          create: createRefreshTokenMock,
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

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      access_token: expect.any(String),
      refresh_token: expect.any(String),
      token_type: "Bearer",
      scope: "openid profile",
    });
    expect(createRefreshTokenMock).toHaveBeenCalledTimes(1);
  });

  it("rotates refresh tokens during refresh_token exchange", async () => {
    prismaMock.oAuthClient.findUnique.mockResolvedValue({
      id: "client-db-id",
      clientSecret: await hashOAuthClientSecret("top-secret"),
      tokenEndpointAuthMethod: "client_secret_post",
      grantTypes: ["authorization_code", "refresh_token"],
    });
    prismaMock.oAuthRefreshToken.findUnique.mockResolvedValue({
      id: "refresh-db-id",
      tokenHash: hashOAuthRefreshToken("refresh-token"),
      scopes: ["openid", "profile", "mcp:tools"],
      resource: "http://localhost/api/mcp",
      expiresAt: new Date(Date.now() + 60_000),
      clientId: "client-db-id",
      userId: "user-1",
    });
    const deleteRefreshTokenMock = vi.fn().mockResolvedValue({ count: 1 });
    const createRefreshTokenMock = vi.fn();
    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback({
        oAuthRefreshToken: {
          deleteMany: deleteRefreshTokenMock,
          create: createRefreshTokenMock,
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
        grant_type: "refresh_token",
        client_id: "client-id",
        client_secret: "top-secret",
        refresh_token: "refresh-token",
        scope: "openid profile",
        resource: "http://localhost/api/mcp",
      }),
    });

    const response = await token(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      access_token: expect.any(String),
      refresh_token: expect.any(String),
      token_type: "Bearer",
      scope: "openid profile",
    });
    expect(prismaMock.oAuthRefreshToken.findUnique).toHaveBeenCalledWith({
      where: {
        tokenHash: hashOAuthRefreshToken("refresh-token"),
      },
    });
    expect(deleteRefreshTokenMock).toHaveBeenCalledTimes(1);
    expect(createRefreshTokenMock).toHaveBeenCalledTimes(1);
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

  it("rejects MCP requests when the token is not resource-bound", async () => {
    prismaMock.oAuthAccessToken.findUnique.mockResolvedValue({
      id: "token-1",
      token: "valid-token",
      expiresAt: new Date(Date.now() + 60_000),
      scopes: ["mcp:tools"],
      resource: null,
      client: {
        clientId: "client-id",
      },
      user: {
        id: "user-1",
        name: "Test User",
        username: "tester",
      },
    });

    const result = await authenticateMcpRequest(
      new Request("http://localhost/api/mcp", {
        headers: { authorization: "Bearer valid-token" },
      }),
    );

    if (!("response" in result)) {
      throw new Error("Expected MCP authentication to fail");
    }

    expect(result.response.status).toBe(401);
    await expect(result.response.json()).resolves.toEqual({
      error: "invalid_token",
    });
  });
});

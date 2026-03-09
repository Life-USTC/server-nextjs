import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    oAuthClient: {
      findUnique: vi.fn(),
    },
    oAuthCode: {
      create: vi.fn(),
    },
    oAuthAccessToken: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

import { POST as authorize } from "@/app/api/oauth/authorize/route";
import { GET as userinfo } from "@/app/api/oauth/userinfo/route";

describe("oauth routes", () => {
  beforeEach(() => {
    authMock.mockReset();
    prismaMock.oAuthClient.findUnique.mockReset();
    prismaMock.oAuthCode.create.mockReset();
    prismaMock.oAuthAccessToken.findUnique.mockReset();
    prismaMock.oAuthAccessToken.delete.mockReset();
  });

  it("trims requested scopes to the client's registered scopes", async () => {
    authMock.mockResolvedValue({
      user: { id: "user-1" },
    });
    prismaMock.oAuthClient.findUnique.mockResolvedValue({
      id: "client-db-id",
      redirectUris: ["https://client.example/callback"],
      scopes: ["openid"],
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
});

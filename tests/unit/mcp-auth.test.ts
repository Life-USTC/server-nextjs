import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyOAuthAccessTokenMock = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    oAuthAccessToken: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/log/oauth-debug", () => ({
  isOAuthDebugLogging: () => false,
  logOAuthDebug: vi.fn(),
}));

vi.mock("better-auth/oauth2", () => ({
  verifyAccessToken: verifyOAuthAccessTokenMock,
}));

vi.mock("@/lib/mcp/urls", () => ({
  getJwksUrlForOAuthVerification: () => "https://life.example/api/auth/jwks",
  getOAuthMcpAudienceUrls: () => [
    "https://life.example/api/mcp",
    "https://life.example/api/auth/oauth2/userinfo",
    "https://life.example/api/auth",
  ],
  getOAuthMcpResourceUrl: () => "https://life.example/api/mcp",
  getOAuthProtectedResourceMetadataUrl: () =>
    new URL(
      "https://life.example/.well-known/oauth-protected-resource/api/mcp",
    ),
  getOAuthTokenVerificationIssuers: () => [
    "https://life.example/api/auth",
    "https://life.example",
  ],
}));

describe("MCP auth", () => {
  beforeEach(() => {
    vi.resetModules();
    verifyOAuthAccessTokenMock.mockReset();
  });

  it("accepts canonical and legacy OAuth issuers for JWT access tokens", async () => {
    verifyOAuthAccessTokenMock.mockResolvedValue({
      azp: "client-id",
      aud: "https://life.example/api/mcp",
      exp: 1_900_000_000,
      scope: "mcp:tools",
      sub: "user-id",
    });
    const { verifyAccessToken } = await import("@/lib/mcp/auth");

    const authInfo = await verifyAccessToken(
      new Request("https://life.example/api/mcp"),
      "header.payload.signature",
    );

    expect(verifyOAuthAccessTokenMock).toHaveBeenCalledWith(
      "header.payload.signature",
      expect.objectContaining({
        jwksUrl: "https://life.example/api/auth/jwks",
        verifyOptions: {
          issuer: ["https://life.example/api/auth", "https://life.example"],
          audience: [
            "https://life.example/api/mcp",
            "https://life.example/api/auth/oauth2/userinfo",
            "https://life.example/api/auth",
          ],
        },
      }),
    );
    expect(authInfo).toMatchObject({
      clientId: "client-id",
      scopes: ["mcp:tools"],
      extra: { userId: "user-id" },
    });
  });
});

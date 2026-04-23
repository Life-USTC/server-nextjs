import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const verifyAccessTokenMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {},
}));

vi.mock("better-auth/oauth2", () => ({
  verifyAccessToken: verifyAccessTokenMock,
}));

vi.mock("@/lib/mcp/urls", () => ({
  getJwksUrlForOAuthVerification: () => "https://life.example/api/auth/jwks",
  getOAuthIssuerUrl: () => new URL("https://life.example/api/auth"),
}));

vi.mock("@/lib/site-url", () => ({
  getPublicOrigin: () => "https://life.example",
}));

describe("auth helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    authMock.mockReset();
    verifyAccessTokenMock.mockReset();
  });

  it("uses the route request headers for session-cookie fallback", async () => {
    authMock.mockResolvedValue({ user: { id: "user-from-cookie" } });
    const { resolveApiUserId } = await import("@/lib/auth/helpers");
    const request = new Request("https://life.example/api/me", {
      headers: {
        cookie: "better-auth.session_token=session-token",
      },
    });

    await expect(resolveApiUserId(request)).resolves.toBe("user-from-cookie");
    expect(authMock).toHaveBeenCalledWith(request.headers);
    expect(verifyAccessTokenMock).not.toHaveBeenCalled();
  });

  it("prefers a valid bearer access token over session cookies", async () => {
    verifyAccessTokenMock.mockResolvedValue({ sub: "user-from-token" });
    const { resolveApiUserId } = await import("@/lib/auth/helpers");
    const request = new Request("https://life.example/api/me", {
      headers: {
        authorization: "Bearer access-token",
        cookie: "better-auth.session_token=session-token",
      },
    });

    await expect(resolveApiUserId(request)).resolves.toBe("user-from-token");
    expect(authMock).not.toHaveBeenCalled();
    expect(verifyAccessTokenMock).toHaveBeenCalledWith(
      "access-token",
      expect.objectContaining({
        jwksUrl: "https://life.example/api/auth/jwks",
      }),
    );
  });
});

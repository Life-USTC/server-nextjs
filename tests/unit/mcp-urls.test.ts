import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCanonicalOAuthIssuer,
  getOAuthAuthorizationServerMetadataUrl,
  getOAuthIssuerUrl,
  getOAuthMcpAudienceUrls,
  getOAuthOpenIdConfigurationCompatibilityUrl,
  getOAuthOpenIdConfigurationUrl,
  getOAuthProtectedResourceMetadataUrl,
  getOAuthProviderValidAudiences,
  getOAuthRestAudienceUrls,
} from "@/lib/mcp/urls";
import {
  getBetterAuthBaseUrl,
  getCanonicalOrigin,
  getPublicOrigin,
} from "@/lib/site-url";

describe("MCP URL helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses APP_PUBLIC_ORIGIN for public links", () => {
    vi.stubEnv("APP_PUBLIC_ORIGIN", "https://preview.example.com");
    expect(getPublicOrigin()).toBe("https://preview.example.com");
    expect(getBetterAuthBaseUrl()).toBe("https://preview.example.com/api/auth");
  });

  it("falls back to VERCEL_URL when APP_PUBLIC_ORIGIN is unset", () => {
    vi.stubEnv("APP_PUBLIC_ORIGIN", "");
    vi.stubEnv("BETTER_AUTH_URL", "");
    vi.stubEnv("VERCEL_URL", "life-preview.vercel.app");
    expect(getPublicOrigin()).toBe("https://life-preview.vercel.app");
  });

  it("falls back to BETTER_AUTH_URL when APP_PUBLIC_ORIGIN is unset", () => {
    vi.stubEnv("APP_PUBLIC_ORIGIN", "");
    vi.stubEnv("BETTER_AUTH_URL", "https://legacy.example.com");
    expect(getPublicOrigin()).toBe("https://legacy.example.com");
    expect(getBetterAuthBaseUrl()).toBe("https://legacy.example.com/api/auth");
  });

  it("falls back to VERCEL_PROJECT_PRODUCTION_URL for canonical origin", () => {
    vi.stubEnv("APP_CANONICAL_ORIGIN", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "life-ustc.tiankaima.dev");
    expect(getCanonicalOrigin()).toBe("https://life-ustc.tiankaima.dev");
  });

  it("derives canonical OAuth and MCP metadata URLs from path-based issuer/resource identifiers", () => {
    vi.stubEnv("APP_PUBLIC_ORIGIN", "https://life.example.com");
    expect(getCanonicalOAuthIssuer()).toBe("https://life.example.com/api/auth");
    expect(getOAuthRestAudienceUrls()).toEqual([
      "https://life.example.com",
      "https://life.example.com/api/auth",
    ]);
    expect(getOAuthProviderValidAudiences()).toEqual([
      "https://life.example.com",
      "https://life.example.com/api/auth",
      "https://life.example.com/api/mcp",
    ]);
    expect(getOAuthMcpAudienceUrls()).toEqual([
      "https://life.example.com/api/mcp",
      "https://life.example.com/api/auth/oauth2/userinfo",
      "https://life.example.com/api/auth",
    ]);
    expect(getOAuthIssuerUrl().toString()).toBe(
      "https://life.example.com/api/auth",
    );
    expect(getOAuthAuthorizationServerMetadataUrl().toString()).toBe(
      "https://life.example.com/.well-known/oauth-authorization-server/api/auth",
    );
    expect(getOAuthOpenIdConfigurationUrl().toString()).toBe(
      "https://life.example.com/api/auth/.well-known/openid-configuration",
    );
    expect(getOAuthOpenIdConfigurationCompatibilityUrl().toString()).toBe(
      "https://life.example.com/.well-known/openid-configuration/api/auth",
    );
    expect(getOAuthProtectedResourceMetadataUrl().toString()).toBe(
      "https://life.example.com/.well-known/oauth-protected-resource/api/mcp",
    );
  });
});

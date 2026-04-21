import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getOAuthAuthorizationServerMetadataUrl,
  getOAuthIssuerUrl,
  getSiteOrigin,
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
    expect(getSiteOrigin()).toBe("https://preview.example.com");
    expect(getBetterAuthBaseUrl()).toBe("https://preview.example.com/api/auth");
  });

  it("falls back to VERCEL_URL when APP_PUBLIC_ORIGIN is unset", () => {
    vi.stubEnv("APP_PUBLIC_ORIGIN", "");
    vi.stubEnv("VERCEL_URL", "life-preview.vercel.app");
    expect(getPublicOrigin()).toBe("https://life-preview.vercel.app");
  });

  it("falls back to VERCEL_PROJECT_PRODUCTION_URL for canonical origin", () => {
    vi.stubEnv("APP_CANONICAL_ORIGIN", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "life-ustc.tiankaima.dev");
    expect(getCanonicalOrigin()).toBe("https://life-ustc.tiankaima.dev");
  });

  it("keeps OAuth issuer and metadata on the public origin", () => {
    vi.stubEnv("APP_PUBLIC_ORIGIN", "https://life.example.com");
    expect(getOAuthIssuerUrl().toString()).toBe(
      "https://life.example.com/api/auth",
    );
    expect(getOAuthAuthorizationServerMetadataUrl().toString()).toBe(
      "https://life.example.com/.well-known/oauth-authorization-server",
    );
  });
});

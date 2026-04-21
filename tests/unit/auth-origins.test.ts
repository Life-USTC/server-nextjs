import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAuthTrustedOrigins,
  getOAuthProxyProductionUrl,
  getOAuthProxySecret,
} from "@/lib/auth/auth-origins";

describe("auth origin helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("includes current, canonical, localhost, and vercel preview origins", () => {
    vi.stubEnv("APP_PUBLIC_ORIGIN", "https://preview-123.vercel.app");
    vi.stubEnv("APP_CANONICAL_ORIGIN", "https://life-ustc.tiankaima.dev");

    expect(getAuthTrustedOrigins()).toEqual([
      "https://preview-123.vercel.app",
      "https://life-ustc.tiankaima.dev",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://*.vercel.app",
    ]);
  });

  it("uses canonical origin as the OAuth proxy production URL", () => {
    vi.stubEnv("APP_PUBLIC_ORIGIN", "https://preview-123.vercel.app");
    vi.stubEnv("APP_CANONICAL_ORIGIN", "https://life-ustc.tiankaima.dev");

    expect(getOAuthProxyProductionUrl()).toBe(
      "https://life-ustc.tiankaima.dev",
    );
  });

  it("returns the configured OAuth proxy secret when present", () => {
    vi.stubEnv("OAUTH_PROXY_SECRET", "shared-proxy-secret");
    expect(getOAuthProxySecret()).toBe("shared-proxy-secret");
  });

  it("ignores blank OAuth proxy secret values", () => {
    vi.stubEnv("OAUTH_PROXY_SECRET", "   ");
    expect(getOAuthProxySecret()).toBeUndefined();
  });
});

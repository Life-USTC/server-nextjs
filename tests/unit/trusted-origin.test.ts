import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildTrustedAuthUrl,
  getTrustedAuthOrigin,
} from "@/lib/auth/trusted-origin";

function makeRequest(url = "http://localhost:3000/test") {
  return new Request(url);
}

describe("getTrustedAuthOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns origin from BETTER_AUTH_URL when set", () => {
    vi.stubEnv("BETTER_AUTH_URL", "https://auth.example.com/some/path");
    vi.stubEnv("NEXTAUTH_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    expect(getTrustedAuthOrigin(makeRequest())).toBe(
      "https://auth.example.com",
    );
  });

  it("falls back to NEXTAUTH_URL when BETTER_AUTH_URL is unset", () => {
    vi.stubEnv("BETTER_AUTH_URL", "");
    vi.stubEnv("NEXTAUTH_URL", "https://next.example.com");
    vi.stubEnv("VERCEL_URL", "");
    expect(getTrustedAuthOrigin(makeRequest())).toBe(
      "https://next.example.com",
    );
  });

  it("falls back to VERCEL_URL when neither is set", () => {
    vi.stubEnv("BETTER_AUTH_URL", "");
    vi.stubEnv("NEXTAUTH_URL", "");
    vi.stubEnv("VERCEL_URL", "vercel-app.vercel.app");
    expect(getTrustedAuthOrigin(makeRequest())).toBe(
      "https://vercel-app.vercel.app",
    );
  });

  it("adds https:// if missing from configured URL", () => {
    vi.stubEnv("BETTER_AUTH_URL", "my-app.example.com");
    vi.stubEnv("NEXTAUTH_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    expect(getTrustedAuthOrigin(makeRequest())).toBe(
      "https://my-app.example.com",
    );
  });

  it("strips path and query from configured URL", () => {
    vi.stubEnv("BETTER_AUTH_URL", "https://auth.example.com/api/auth?foo=bar");
    vi.stubEnv("NEXTAUTH_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    expect(getTrustedAuthOrigin(makeRequest())).toBe(
      "https://auth.example.com",
    );
  });

  it("returns request origin in non-production mode when no env vars set", () => {
    vi.stubEnv("BETTER_AUTH_URL", "");
    vi.stubEnv("NEXTAUTH_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    vi.stubEnv("NODE_ENV", "development");
    const req = makeRequest("http://localhost:3000/dashboard");
    expect(getTrustedAuthOrigin(req)).toBe("http://localhost:3000");
  });

  it("throws in production mode when no env vars set", () => {
    vi.stubEnv("BETTER_AUTH_URL", "");
    vi.stubEnv("NEXTAUTH_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => getTrustedAuthOrigin(makeRequest())).toThrow(
      /Missing BETTER_AUTH_URL/,
    );
  });

  it("skips blank/whitespace-only env values", () => {
    vi.stubEnv("BETTER_AUTH_URL", "   ");
    vi.stubEnv("NEXTAUTH_URL", "https://fallback.example.com");
    vi.stubEnv("VERCEL_URL", "");
    expect(getTrustedAuthOrigin(makeRequest())).toBe(
      "https://fallback.example.com",
    );
  });
});

describe("buildTrustedAuthUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("combines origin with pathname", () => {
    vi.stubEnv("BETTER_AUTH_URL", "https://auth.example.com");
    vi.stubEnv("NEXTAUTH_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    const url = buildTrustedAuthUrl("/api/auth/callback", makeRequest());
    expect(url.href).toBe("https://auth.example.com/api/auth/callback");
  });

  it("returns a URL instance", () => {
    vi.stubEnv("BETTER_AUTH_URL", "https://auth.example.com");
    vi.stubEnv("NEXTAUTH_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    const url = buildTrustedAuthUrl("/login", makeRequest());
    expect(url).toBeInstanceOf(URL);
    expect(url.pathname).toBe("/login");
  });

  it("handles origin URL with trailing slash in env", () => {
    vi.stubEnv("BETTER_AUTH_URL", "https://auth.example.com/");
    vi.stubEnv("NEXTAUTH_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    const url = buildTrustedAuthUrl("/callback", makeRequest());
    expect(url.pathname).toBe("/callback");
  });
});

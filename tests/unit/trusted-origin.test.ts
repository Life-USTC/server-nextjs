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

  it("returns origin from APP_PUBLIC_ORIGIN when set", () => {
    vi.stubEnv("APP_PUBLIC_ORIGIN", "https://preview.example.com/some/path");
    expect(getTrustedAuthOrigin(makeRequest())).toBe(
      "https://preview.example.com",
    );
  });

  it("falls back to VERCEL_URL when APP_PUBLIC_ORIGIN is unset", () => {
    vi.stubEnv("APP_PUBLIC_ORIGIN", "");
    vi.stubEnv("VERCEL_URL", "life-ustc-preview.vercel.app");
    expect(getTrustedAuthOrigin(makeRequest())).toBe(
      "https://life-ustc-preview.vercel.app",
    );
  });

  it("throws when APP_PUBLIC_ORIGIN is not a valid absolute URL", () => {
    vi.stubEnv("APP_PUBLIC_ORIGIN", "my-app.example.com");
    expect(() => getTrustedAuthOrigin(makeRequest())).toThrow(
      /valid absolute URL/,
    );
  });
});

describe("buildTrustedAuthUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("combines origin with pathname", () => {
    vi.stubEnv("APP_PUBLIC_ORIGIN", "https://auth.example.com");
    const url = buildTrustedAuthUrl("/api/auth/callback", makeRequest());
    expect(url.href).toBe("https://auth.example.com/api/auth/callback");
  });

  it("returns a URL instance", () => {
    vi.stubEnv("APP_PUBLIC_ORIGIN", "https://auth.example.com");
    const url = buildTrustedAuthUrl("/login", makeRequest());
    expect(url).toBeInstanceOf(URL);
    expect(url.pathname).toBe("/login");
  });

  it("handles origin URL with trailing slash in env", () => {
    vi.stubEnv("APP_PUBLIC_ORIGIN", "https://auth.example.com/");
    const url = buildTrustedAuthUrl("/callback", makeRequest());
    expect(url.pathname).toBe("/callback");
  });
});

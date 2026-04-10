import { describe, expect, it } from "vitest";
import { buildOAuthErrorRedirectUri } from "@/lib/oauth/redirect";
import {
  hashOAuthClientSecretForDbStorage,
  normalizeResourceIndicator,
  resourceIndicatorsMatch,
} from "@/lib/oauth/utils";

describe("oauth/utils", () => {
  it("hashes client secrets deterministically with SHA-256 base64url", () => {
    const secret = "super-secret-value";
    const hash = hashOAuthClientSecretForDbStorage(secret);

    expect(hash).not.toBe(secret);
    expect(hash).toMatch(/^[A-Za-z0-9_-]+$/);
    // Same input produces the same hash
    expect(hashOAuthClientSecretForDbStorage(secret)).toBe(hash);
    // Different input produces a different hash
    expect(hashOAuthClientSecretForDbStorage("other-secret")).not.toBe(hash);
  });

  it("normalizes resource indicators", () => {
    expect(normalizeResourceIndicator("https://Example.COM/api/")).toBe(
      "https://example.com/api/",
    );
    expect(normalizeResourceIndicator("https://example.com:443/api")).toBe(
      "https://example.com/api",
    );
    expect(normalizeResourceIndicator("http://example.com:8080/api")).toBe(
      "http://example.com:8080/api",
    );
  });

  it("rejects resource indicators with fragments", () => {
    expect(() =>
      normalizeResourceIndicator("https://example.com/api#frag"),
    ).toThrow("must not include fragments");
  });

  it("matches equivalent resource indicators", () => {
    expect(
      resourceIndicatorsMatch(
        "https://Example.COM/api",
        "https://example.com/api",
      ),
    ).toBe(true);
    expect(
      resourceIndicatorsMatch(
        "https://example.com:443/api",
        "https://example.com/api",
      ),
    ).toBe(true);
    expect(
      resourceIndicatorsMatch(
        "https://example.com/api",
        "https://example.com/other",
      ),
    ).toBe(false);
  });

  it("builds OAuth error redirect URIs", () => {
    expect(
      buildOAuthErrorRedirectUri({
        redirectUri: "https://client.example/callback",
        error: "invalid_scope",
        state: "abc123",
        errorDescription: "Scope is not allowed",
      }),
    ).toBe(
      "https://client.example/callback?error=invalid_scope&state=abc123&error_description=Scope+is+not+allowed",
    );
  });
});

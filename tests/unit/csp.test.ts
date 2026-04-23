import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildContentSecurityPolicy,
  createScriptNonce,
} from "@/lib/security/csp";
import { getS3ConnectSources, getS3Region } from "@/lib/storage/s3";

describe("csp helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates a non-empty nonce", () => {
    const nonce = createScriptNonce();
    expect(nonce.length).toBeGreaterThan(10);
  });

  it("builds a CSP that requires a matching script nonce", () => {
    const policy = buildContentSecurityPolicy("abc123");
    const scriptDirective = policy
      .split("; ")
      .find((directive) => directive.startsWith("script-src"));

    expect(policy).toContain("script-src 'self' 'nonce-abc123'");
    expect(scriptDirective).toBeDefined();
    expect(scriptDirective).not.toContain("'unsafe-inline'");
    expect(scriptDirective).not.toContain("'unsafe-eval'");
    expect(scriptDirective).not.toContain("unpkg.com");
    expect(policy).toContain("object-src 'none'");
  });

  it("allows configured external avatar image sources", () => {
    const policy = buildContentSecurityPolicy("abc123");
    const imageDirective = policy
      .split("; ")
      .find((directive) => directive.startsWith("img-src"));

    expect(imageDirective).toBeDefined();
    expect(imageDirective).toContain("https://avatars.githubusercontent.com");
    expect(imageDirective).toContain("https://*.googleusercontent.com");
    expect(imageDirective).toContain("https://api.dicebear.com");
  });

  it("treats a blank AWS_REGION as unset", () => {
    vi.stubEnv("AWS_REGION", "   ");
    expect(getS3Region()).toBe("us-east-1");
  });

  it("allows both AWS S3 URL shapes for uploads", () => {
    vi.stubEnv("S3_BUCKET", "bucket.with.dots");
    vi.stubEnv("AWS_REGION", "us-east-1");

    const policy = buildContentSecurityPolicy("abc123");
    const connectDirective = policy
      .split("; ")
      .find((directive) => directive.startsWith("connect-src"));

    expect(connectDirective).toBeDefined();
    expect(connectDirective).toContain(
      "https://bucket.with.dots.s3.us-east-1.amazonaws.com",
    );
    expect(connectDirective).toContain("https://s3.us-east-1.amazonaws.com");
  });

  it("allows a configured S3-compatible endpoint origin", () => {
    vi.stubEnv("S3_BUCKET", "bucket.with.dots");
    vi.stubEnv(
      "AWS_ENDPOINT_URL_S3",
      "https://account-id.r2.cloudflarestorage.com",
    );

    expect(getS3ConnectSources()).toEqual([
      "https://account-id.r2.cloudflarestorage.com",
    ]);

    const policy = buildContentSecurityPolicy("abc123");
    const connectDirective = policy
      .split("; ")
      .find((directive) => directive.startsWith("connect-src"));

    expect(connectDirective).toBeDefined();
    expect(connectDirective).toContain(
      "https://account-id.r2.cloudflarestorage.com",
    );
    expect(connectDirective).not.toContain("amazonaws.com");
  });
});

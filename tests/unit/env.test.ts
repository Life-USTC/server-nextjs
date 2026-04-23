import { afterEach, describe, expect, it, vi } from "vitest";

describe("env validation", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("throws for invalid production environment variables", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("JWT_SECRET", "");
    vi.stubEnv("AUTH_SECRET", "");

    await expect(import("@/env")).rejects.toThrow(
      "Invalid environment variables",
    );
  });

  it("throws for invalid test environment variables", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("JWT_SECRET", "");
    vi.stubEnv("AUTH_SECRET", "");

    await expect(import("@/env")).rejects.toThrow(
      "Invalid environment variables",
    );
  });

  it("returns a typed partial environment in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("JWT_SECRET", "");
    vi.stubEnv("AUTH_SECRET", "");

    const { env } = await import("@/env");

    expect(env.NODE_ENV).toBe("development");
    expect(env.DATABASE_URL).toBeUndefined();
  });
});

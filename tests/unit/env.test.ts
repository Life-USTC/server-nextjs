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

    const { loadEnv } = await import("@/env");

    expect(() => loadEnv()).toThrow("Invalid environment variables");
  });

  it("throws for invalid test environment variables", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("JWT_SECRET", "");
    vi.stubEnv("AUTH_SECRET", "");

    const { loadEnv } = await import("@/env");

    expect(() => loadEnv()).toThrow("Invalid environment variables");
  });

  it("allows production builds to skip runtime-only secrets", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("JWT_SECRET", "");
    vi.stubEnv("AUTH_SECRET", "");

    const { loadEnv } = await import("@/env");
    const loadedEnv = loadEnv();

    expect(loadedEnv.NODE_ENV).toBe("production");
    expect(loadedEnv.DATABASE_URL).toBeUndefined();
  });

  it("returns a typed partial environment in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("JWT_SECRET", "");
    vi.stubEnv("AUTH_SECRET", "");

    const { loadEnv } = await import("@/env");
    const loadedEnv = loadEnv();

    expect(loadedEnv.NODE_ENV).toBe("development");
    expect(loadedEnv.DATABASE_URL).toBeUndefined();
  });

  it("shares trimmed env helpers across auth/runtime call sites", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("JWT_SECRET", "");
    vi.stubEnv("AUTH_SECRET", "");
    vi.stubEnv("FEATURE_FLAG", " 1 ");
    vi.stubEnv("FIRST_SECRET", "   ");
    vi.stubEnv("SECOND_SECRET", " value ");
    vi.stubEnv("USERNAME", " Dev-User ");

    const {
      getEnvFlag,
      getFirstOptionalTrimmedEnv,
      getOptionalLowercaseEnv,
      getOptionalTrimmedEnv,
    } = await import("@/env");

    expect(getOptionalTrimmedEnv("SECOND_SECRET")).toBe("value");
    expect(getOptionalLowercaseEnv("USERNAME")).toBe("dev-user");
    expect(getFirstOptionalTrimmedEnv(["FIRST_SECRET", "SECOND_SECRET"])).toBe(
      "value",
    );
    expect(getEnvFlag("FEATURE_FLAG")).toBe(true);
  });
});

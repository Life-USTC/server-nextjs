import { getOptionalTrimmedEnv } from "@/env";

const DEFAULT_LOCAL_ORIGIN = "http://localhost:3000";

function normalizeAbsoluteOrigin(value: string, envName: string): string {
  try {
    return new URL(value).origin;
  } catch {
    throw new Error(`${envName} must be a valid absolute URL`);
  }
}

function normalizeVercelHost(value: string, envName: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${envName} must not be blank`);
  }
  return normalizeAbsoluteOrigin(`https://${trimmed}`, envName);
}

/**
 * Public origin of the current deployment. Prefer explicit configuration, then
 * fall back to Vercel runtime metadata, then localhost for local development.
 */
export function getPublicOrigin(): string {
  const configured = getOptionalTrimmedEnv("APP_PUBLIC_ORIGIN");
  if (configured) {
    return normalizeAbsoluteOrigin(configured, "APP_PUBLIC_ORIGIN");
  }

  const legacyBetterAuthUrl = getOptionalTrimmedEnv("BETTER_AUTH_URL");
  if (legacyBetterAuthUrl) {
    return normalizeAbsoluteOrigin(legacyBetterAuthUrl, "BETTER_AUTH_URL");
  }

  const vercelUrl = getOptionalTrimmedEnv("VERCEL_URL");
  if (vercelUrl) {
    return normalizeVercelHost(vercelUrl, "VERCEL_URL");
  }

  return DEFAULT_LOCAL_ORIGIN;
}

/**
 * Canonical production origin for SEO and stable metadata. Vercel provides the
 * production host even in previews, which is a useful fallback when unset.
 */
export function getCanonicalOrigin(): string {
  const configured = getOptionalTrimmedEnv("APP_CANONICAL_ORIGIN");
  if (configured) {
    return normalizeAbsoluteOrigin(configured, "APP_CANONICAL_ORIGIN");
  }

  const vercelProductionUrl = getOptionalTrimmedEnv(
    "VERCEL_PROJECT_PRODUCTION_URL",
  );
  if (vercelProductionUrl) {
    return normalizeVercelHost(
      vercelProductionUrl,
      "VERCEL_PROJECT_PRODUCTION_URL",
    );
  }

  return getPublicOrigin();
}

export function getBetterAuthBaseUrl(): string {
  return new URL("/api/auth", `${getPublicOrigin()}/`)
    .toString()
    .replace(/\/$/, "");
}

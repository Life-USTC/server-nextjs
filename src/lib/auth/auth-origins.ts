import { getCanonicalOrigin, getPublicOrigin } from "@/lib/site-url";

const LOCALHOST_AUTH_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];
const VERCEL_PREVIEW_AUTH_ORIGIN = "https://*.vercel.app";

export function getAuthTrustedOrigins(): string[] {
  return Array.from(
    new Set([
      getPublicOrigin(),
      getCanonicalOrigin(),
      ...LOCALHOST_AUTH_ORIGINS,
      VERCEL_PREVIEW_AUTH_ORIGIN,
    ]),
  );
}

export function getOAuthProxyProductionUrl(): string {
  return getCanonicalOrigin();
}

export function getOAuthProxySecret(): string | undefined {
  const configured = process.env.OAUTH_PROXY_SECRET?.trim();
  return configured && configured.length > 0 ? configured : undefined;
}

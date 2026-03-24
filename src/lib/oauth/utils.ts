import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const CLIENT_SECRET_HASH_VERSION = "s1";

export const OAUTH_PUBLIC_CLIENT_AUTH_METHOD = "none";
export const OAUTH_CLIENT_SECRET_BASIC_AUTH_METHOD = "client_secret_basic";
export const OAUTH_CLIENT_SECRET_POST_AUTH_METHOD = "client_secret_post";
export const OAUTH_CODE_CHALLENGE_METHOD_S256 = "S256";
export const MCP_TOOLS_SCOPE = "mcp:tools";
export const DEFAULT_OAUTH_CLIENT_SCOPES = ["openid", "profile"] as const;
export type SupportedOAuthClientAuthMethod =
  | typeof OAUTH_PUBLIC_CLIENT_AUTH_METHOD
  | typeof OAUTH_CLIENT_SECRET_BASIC_AUTH_METHOD
  | typeof OAUTH_CLIENT_SECRET_POST_AUTH_METHOD;

/** Generate a cryptographically random token string (URL-safe base64). */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashOAuthRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

export async function hashOAuthClientSecret(secret: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = (await scrypt(secret, salt, 32)) as Buffer;

  return [
    CLIENT_SECRET_HASH_VERSION,
    salt.toString("base64url"),
    hash.toString("base64url"),
  ].join("$");
}

export async function verifyOAuthClientSecret(
  secret: string,
  storedHash: string,
): Promise<boolean> {
  const [version, saltEncoded, hashEncoded] = storedHash.split("$");
  if (version !== CLIENT_SECRET_HASH_VERSION || !saltEncoded || !hashEncoded) {
    return false;
  }

  const salt = Buffer.from(saltEncoded, "base64url");
  const expectedHash = Buffer.from(hashEncoded, "base64url");
  const actualHash = (await scrypt(
    secret,
    salt,
    expectedHash.length,
  )) as Buffer;

  return timingSafeEqual(expectedHash, actualHash);
}

export function generateCodeChallenge(codeVerifier: string): string {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}

export function verifyPkceCodeVerifier({
  codeChallenge,
  codeChallengeMethod,
  codeVerifier,
}: {
  codeChallenge: string;
  codeChallengeMethod: string;
  codeVerifier: string;
}): boolean {
  if (codeChallengeMethod !== OAUTH_CODE_CHALLENGE_METHOD_S256) {
    return false;
  }

  return generateCodeChallenge(codeVerifier) === codeChallenge;
}

export function normalizeResourceIndicator(value: string | URL): string {
  const parsed = new URL(value);

  if (parsed.hash) {
    throw new TypeError("Resource indicators must not include fragments");
  }

  const protocol = parsed.protocol.toLowerCase();
  const hostname = parsed.hostname.toLowerCase();
  const port =
    parsed.port &&
    !(
      (protocol === "https:" && parsed.port === "443") ||
      (protocol === "http:" && parsed.port === "80")
    )
      ? `:${parsed.port}`
      : "";
  const pathname = parsed.pathname === "/" ? "" : parsed.pathname;

  return `${protocol}//${hostname}${port}${pathname}${parsed.search}`;
}

export function resourceIndicatorsMatch(
  left: string | URL,
  right: string | URL,
): boolean {
  return normalizeResourceIndicator(left) === normalizeResourceIndicator(right);
}

/** Default lifetime for authorization codes (10 minutes). */
export const CODE_LIFETIME_MS = 10 * 60 * 1000;

/** Default lifetime for access tokens (1 hour). */
export const ACCESS_TOKEN_LIFETIME_MS = 60 * 60 * 1000;

/** Default lifetime for refresh tokens (30 days). */
export const REFRESH_TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

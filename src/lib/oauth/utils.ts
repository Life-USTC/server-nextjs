import { randomBytes } from "node:crypto";

/** Generate a cryptographically random token string (URL-safe base64). */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Default lifetime for authorization codes (10 minutes). */
export const CODE_LIFETIME_MS = 10 * 60 * 1000;

/** Default lifetime for access tokens (1 hour). */
export const ACCESS_TOKEN_LIFETIME_MS = 60 * 60 * 1000;

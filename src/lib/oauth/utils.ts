import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const CLIENT_SECRET_HASH_VERSION = "s1";

/** Generate a cryptographically random token string (URL-safe base64). */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
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

/** Default lifetime for authorization codes (10 minutes). */
export const CODE_LIFETIME_MS = 10 * 60 * 1000;

/** Default lifetime for access tokens (1 hour). */
export const ACCESS_TOKEN_LIFETIME_MS = 60 * 60 * 1000;

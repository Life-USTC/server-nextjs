import { jwtVerify, SignJWT } from "jose";

function getJWTSecret(): Uint8Array {
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  return new TextEncoder().encode(JWT_SECRET);
}

/**
 * Generate a JWT token for a calendar subscription
 * @param subscriptionId - The ID of the calendar subscription
 * @returns JWT token string
 */
export async function generateCalendarSubscriptionJWT(
  subscriptionId: number,
): Promise<string> {
  const token = await new SignJWT({ sub: subscriptionId.toString() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .sign(getJWTSecret());

  return token;
}

/**
 * Verify and decode a calendar subscription JWT token
 * @param token - JWT token string
 * @returns Subscription ID if valid, null if invalid
 */
export async function verifyCalendarSubscriptionJWT(
  token: string,
): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, getJWTSecret());
    const subscriptionId = Number.parseInt(payload.sub as string, 10);

    if (Number.isNaN(subscriptionId)) {
      return null;
    }

    return subscriptionId;
  } catch {
    return null;
  }
}

/**
 * Extract JWT token from request headers or query params
 * @param request - Next.js request object
 * @returns Token string or null
 */
export function extractToken(request: Request): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // Try query parameter as fallback
  const url = new URL(request.url);
  return url.searchParams.get("token");
}

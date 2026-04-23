import { verifyAccessToken } from "better-auth/oauth2";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import {
  getJwksUrlForOAuthVerification,
  getOAuthIssuerUrl,
} from "@/lib/mcp/urls";
import { getPublicOrigin } from "@/lib/site-url";

export async function requireSignedInUserId() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/signin");
  }

  return userId;
}

/**
 * Resolve the authenticated user ID from a request.
 *
 * Checks in order:
 * 1. Bearer token in the `Authorization` header (OAuth access token)
 * 2. Session cookie via Better Auth
 *
 * Returns `null` when no valid credential is found.
 */
export async function resolveApiUserId(
  request: Request,
): Promise<string | null> {
  // 1. Try Bearer token (OAuth access token)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (token) {
      // Better Auth's jwt plugin sets `iss` to AUTH_BASE_URL (the bare origin,
      // e.g. "http://localhost:3000"), while getOAuthIssuerUrl() adds the
      // "/api/auth" path suffix. Accept both so tokens issued by either path
      // verify correctly.
      const issuerPath = getOAuthIssuerUrl().toString();
      const siteOrigin = getPublicOrigin();

      try {
        const jwt = await verifyAccessToken(token, {
          jwksUrl: getJwksUrlForOAuthVerification(),
          // General protected REST endpoints only accept issuer-bound JWT access
          // tokens. Opaque/no-resource tokens are reserved for the MCP transport,
          // where resource and scope checks happen in src/lib/mcp/auth.ts.
          // Accept both the bare origin (CLI resource) and the issuer path as audiences.
          verifyOptions: {
            issuer: [siteOrigin, issuerPath],
            audience: [siteOrigin, issuerPath],
          },
        });

        const sub = (jwt as { sub?: unknown }).sub;
        if (typeof sub === "string" && sub.length > 0) {
          return sub;
        }
      } catch {
        // Ignore invalid or opaque bearer tokens here and continue to the
        // session-cookie fallback below.
      }
    }
  }

  // 2. Fall back to the session cookie on this route request.
  const session = await auth(request.headers);
  return session?.user?.id ?? null;
}

export async function resolveApiUser(request: Request): Promise<{
  id: string;
  name: string | null;
  image: string | null;
  isAdmin: boolean;
} | null> {
  const userId = await resolveApiUserId(request);
  if (!userId) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      image: true,
      isAdmin: true,
    },
  });
}

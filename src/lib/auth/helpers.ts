import { verifyAccessToken } from "better-auth/oauth2";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

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
      const issuer = (
        process.env.BETTER_AUTH_URL || "http://localhost:3000"
      ).replace(/\/$/, "");

      try {
        const jwt = await verifyAccessToken(token, {
          jwksUrl: `${issuer}/api/auth/jwks`,
          // General protected REST endpoints only accept issuer-bound JWT access
          // tokens. Opaque/no-resource tokens are reserved for the MCP transport,
          // where resource and scope checks happen in src/lib/mcp/auth.ts.
          verifyOptions: { issuer, audience: [issuer] },
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

  // 2. Fall back to session cookie
  const session = await auth();
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

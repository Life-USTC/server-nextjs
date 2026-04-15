import { verifyAccessToken } from "better-auth/oauth2";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { hashOAuthClientSecretForDbStorage } from "@/lib/oauth/utils";

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
          verifyOptions: { issuer, audience: [issuer, `${issuer}/api/mcp`] },
        });

        const sub = (jwt as { sub?: unknown }).sub;
        if (typeof sub === "string" && sub.length > 0) {
          return sub;
        }
      } catch {
        const hashedToken = hashOAuthClientSecretForDbStorage(token);
        const accessToken = await prisma.oAuthAccessToken.findUnique({
          where: { token: hashedToken },
          select: {
            userId: true,
            expiresAt: true,
          },
        });

        if (
          accessToken?.userId &&
          accessToken.expiresAt.getTime() > Date.now()
        ) {
          return accessToken.userId;
        }
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

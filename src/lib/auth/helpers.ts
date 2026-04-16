import { verifyAccessToken } from "better-auth/oauth2";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import {
  hashOAuthClientSecretForDbStorage,
  MCP_TOOLS_SCOPE,
} from "@/lib/oauth/utils";

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
            scopes: true,
          },
        });

        if (
          accessToken?.userId &&
          accessToken.expiresAt.getTime() > Date.now()
        ) {
          // Reject tokens that carry the MCP scope; they were minted for the
          // MCP server and must not be accepted as general REST API credentials.
          // MCP tokens always include openid+profile alongside mcp:tools, so
          // checking every() would be a no-op — includes() is the correct guard.
          const scopes = accessToken.scopes;
          if (scopes.includes(MCP_TOOLS_SCOPE)) {
            return null;
          }

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

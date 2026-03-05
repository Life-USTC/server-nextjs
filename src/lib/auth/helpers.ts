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
 * 2. Session cookie via NextAuth
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
      const accessToken = await prisma.oAuthAccessToken.findUnique({
        where: { token },
        select: { userId: true, expiresAt: true },
      });
      if (accessToken && accessToken.expiresAt > new Date()) {
        return accessToken.userId;
      }
    }
  }

  // 2. Fall back to session cookie
  const session = await auth();
  return session?.user?.id ?? null;
}

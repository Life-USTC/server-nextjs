import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
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
 * Resolve the authenticated user ID from either a session cookie or a Bearer
 * token (OAuth access token issued by this server).
 * Returns the user ID string or null if unauthenticated.
 */
export async function resolveApiUserId(
  request: NextRequest,
): Promise<string | null> {
  // 1. Try Bearer token first
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const accessToken = await prisma.oAuthAccessToken.findUnique({
      where: { token },
      select: { userId: true, expiresAt: true },
    });

    if (
      accessToken &&
      (!accessToken.expiresAt || accessToken.expiresAt > new Date())
    ) {
      return accessToken.userId;
    }
    return null;
  }

  // 2. Fall back to session cookie
  const session = await auth();
  return session?.user?.id ?? null;
}

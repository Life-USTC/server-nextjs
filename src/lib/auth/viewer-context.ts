import { cache } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { toShanghaiIsoString } from "@/lib/time/serialize-date-output";

export type ViewerContext = {
  userId: string | null;
  name: string | null;
  image: string | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isSuspended: boolean;
  suspensionReason: string | null;
  suspensionExpiresAt: string | null;
};

type ViewerAuthData = {
  user: {
    id: string;
    name: string | null;
    image: string | null;
    isAdmin: boolean | null;
  };
  suspension: Awaited<ReturnType<typeof findActiveSuspension>>;
};

export async function findActiveSuspension(userId: string) {
  const now = new Date();
  return prisma.userSuspension.findFirst({
    where: {
      userId,
      liftedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
  });
}

async function findViewerUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, image: true, isAdmin: true },
  });
}

export async function getViewerAuthDataForUserId(
  userId: string,
): Promise<ViewerAuthData | null> {
  const [user, suspension] = await Promise.all([
    findViewerUser(userId),
    findActiveSuspension(userId),
  ]);

  if (!user) {
    return null;
  }

  return { user, suspension };
}

/**
 * Internal per-request cached viewer data fetcher.
 * Deduplicates auth() + user lookup + suspension check within a single request.
 */
const getViewerAuthData = cache(async () => {
  const session = await auth();
  return session?.user?.id ? getViewerAuthDataForUserId(session.user.id) : null;
});

export async function getViewerContext(
  options: { includeAdmin?: boolean; userId?: string | null } = {},
): Promise<ViewerContext> {
  const data =
    typeof options.userId === "string"
      ? await getViewerAuthDataForUserId(options.userId)
      : await getViewerAuthData();

  if (!data) {
    return {
      userId: null,
      name: null,
      image: null,
      isAdmin: false,
      isAuthenticated: false,
      isSuspended: false,
      suspensionReason: null,
      suspensionExpiresAt: null,
    };
  }

  const { user, suspension } = data;
  const shouldExposeAdmin = options.includeAdmin === true;

  return {
    userId: user.id,
    name: user.name ?? null,
    image: user.image ?? null,
    isAdmin: shouldExposeAdmin ? (user.isAdmin ?? false) : false,
    isAuthenticated: true,
    isSuspended: Boolean(suspension),
    suspensionReason: suspension?.reason ?? null,
    suspensionExpiresAt: suspension?.expiresAt
      ? toShanghaiIsoString(suspension.expiresAt)
      : null,
  };
}

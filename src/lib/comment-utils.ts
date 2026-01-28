import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type CommentTargetType =
  | "section"
  | "course"
  | "teacher"
  | "section-teacher";

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

export async function getViewerContext(
  options: { includeAdmin?: boolean } = {},
): Promise<ViewerContext> {
  const session = await auth();
  if (!session?.user?.id) {
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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  const isAdmin = (user as { isAdmin?: boolean } | null)?.isAdmin ?? false;
  const shouldExposeAdmin = options.includeAdmin === true;

  if (!user) {
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

  const suspension = await findActiveSuspension(user.id);

  return {
    userId: user.id,
    name: (user as { name?: string | null }).name ?? null,
    image: (user as { image?: string | null }).image ?? null,
    isAdmin: shouldExposeAdmin ? isAdmin : false,
    isAuthenticated: true,
    isSuspended: Boolean(suspension),
    suspensionReason: suspension?.reason ?? null,
    suspensionExpiresAt: suspension?.expiresAt?.toISOString() ?? null,
  };
}

export function buildUploadUrl(key: string | null | undefined) {
  if (!key) return "";
  const accessUrl = process.env.R2_ACCESS_URL ?? "";
  if (!accessUrl) return "";
  const base = accessUrl.endsWith("/") ? accessUrl.slice(0, -1) : accessUrl;
  return `${base}/${key}`;
}

export async function findActiveSuspension(userId: string) {
  const prismaAny = prisma as typeof prisma & { userSuspension: any };
  const now = new Date();
  return prismaAny.userSuspension.findFirst({
    where: {
      userId,
      liftedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
  });
}

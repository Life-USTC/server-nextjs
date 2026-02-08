import { cache } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type CommentTargetType =
  | "section"
  | "course"
  | "teacher"
  | "section-teacher"
  | "homework";

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

/**
 * Internal per-request cached viewer data fetcher.
 * Deduplicates auth() + user lookup + suspension check within a single request.
 */
const getViewerData = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const [user, suspension] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, image: true, isAdmin: true },
    }),
    findActiveSuspension(session.user.id),
  ]);

  if (!user) {
    return null;
  }

  return { user, suspension };
});

export async function getViewerContext(
  options: { includeAdmin?: boolean } = {},
): Promise<ViewerContext> {
  const data = await getViewerData();

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

export async function resolveSectionTeacherId(
  sectionId: number,
  teacherId: number,
) {
  const section = await prisma.section.findFirst({
    where: {
      id: sectionId,
      teachers: {
        some: { id: teacherId },
      },
    },
    select: { id: true },
  });

  if (!section) return null;

  const sectionTeacher = await prisma.sectionTeacher.upsert({
    where: {
      sectionId_teacherId: {
        sectionId,
        teacherId,
      },
    },
    update: {},
    create: { sectionId, teacherId },
  });

  return sectionTeacher.id as number;
}

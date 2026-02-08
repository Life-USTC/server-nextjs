import { getViewerContext } from "@/lib/comment-utils";
import { prisma } from "@/lib/prisma";

type TargetType = "section" | "course" | "teacher" | "homework";

type EditorSummary = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
};

type DescriptionData = {
  id: string | null;
  content: string;
  updatedAt: string | null;
  lastEditedAt: string | null;
  lastEditedBy: EditorSummary | null;
};

type HistoryItem = {
  id: string;
  createdAt: string;
  previousContent: string | null;
  nextContent: string;
  editor: EditorSummary | null;
};

type ViewerSummary = {
  userId: string | null;
  name: string | null;
  image: string | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isSuspended: boolean;
  suspensionReason: string | null;
  suspensionExpiresAt: string | null;
};

export type DescriptionPayload = {
  description: DescriptionData;
  history: HistoryItem[];
  viewer: ViewerSummary;
};

function getTargetWhere(targetType: TargetType, targetId: number | string) {
  switch (targetType) {
    case "section":
      return typeof targetId === "number" ? { sectionId: targetId } : null;
    case "course":
      return typeof targetId === "number" ? { courseId: targetId } : null;
    case "teacher":
      return typeof targetId === "number" ? { teacherId: targetId } : null;
    case "homework":
      return typeof targetId === "string" ? { homeworkId: targetId } : null;
    default:
      return null;
  }
}

export async function getDescriptionPayload(
  targetType: TargetType,
  targetId: number | string,
  viewerOverride?: ViewerSummary,
): Promise<DescriptionPayload> {
  const whereTarget = getTargetWhere(targetType, targetId);
  const viewer =
    viewerOverride ?? (await getViewerContext({ includeAdmin: false }));

  if (!whereTarget) {
    return {
      description: {
        id: null,
        content: "",
        updatedAt: null,
        lastEditedAt: null,
        lastEditedBy: null,
      },
      history: [],
      viewer,
    };
  }

  const description = await prisma.description.findFirst({
    where: whereTarget,
    include: {
      lastEditedBy: {
        select: { id: true, name: true, image: true, username: true },
      },
    },
  });

  const history = description
    ? await prisma.descriptionEdit.findMany({
        where: { descriptionId: description.id },
        include: {
          editor: {
            select: { id: true, name: true, image: true, username: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    : [];

  return {
    description: description
      ? {
          id: description.id,
          content: description.content ?? "",
          updatedAt: description.updatedAt?.toISOString() ?? null,
          lastEditedAt: description.lastEditedAt?.toISOString() ?? null,
          lastEditedBy: description.lastEditedBy ?? null,
        }
      : {
          id: null,
          content: "",
          updatedAt: null,
          lastEditedAt: null,
          lastEditedBy: null,
        },
    history: history.map((entry: any) => ({
      id: entry.id,
      createdAt: entry.createdAt.toISOString(),
      previousContent: entry.previousContent ?? null,
      nextContent: entry.nextContent ?? "",
      editor: entry.editor ?? null,
    })),
    viewer,
  };
}

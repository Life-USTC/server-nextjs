import {
  type DescriptionTargetType,
  resolveDescriptionTarget,
} from "@/features/descriptions/lib/description-targets";
import { getViewerContext } from "@/lib/auth/viewer-context";
import { prisma } from "@/lib/db/prisma";
import { toShanghaiIsoString } from "@/lib/time/serialize-date-output";

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

export async function getDescriptionPayload(
  targetType: DescriptionTargetType,
  targetId: number | string,
  viewerOverride?: ViewerSummary,
): Promise<DescriptionPayload> {
  const target = resolveDescriptionTarget(targetType, targetId);
  const viewer =
    viewerOverride ?? (await getViewerContext({ includeAdmin: false }));

  if (!target) {
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
    where: target.where,
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
          updatedAt: description.updatedAt
            ? toShanghaiIsoString(description.updatedAt)
            : null,
          lastEditedAt: description.lastEditedAt
            ? toShanghaiIsoString(description.lastEditedAt)
            : null,
          lastEditedBy: description.lastEditedBy ?? null,
        }
      : {
          id: null,
          content: "",
          updatedAt: null,
          lastEditedAt: null,
          lastEditedBy: null,
        },
    history: history.map((entry) => ({
      id: entry.id,
      createdAt: toShanghaiIsoString(entry.createdAt),
      previousContent: entry.previousContent ?? null,
      nextContent: entry.nextContent ?? "",
      editor: entry.editor
        ? {
            id: entry.editor.id,
            name: entry.editor.name,
            username: entry.editor.username,
            image: entry.editor.image,
          }
        : null,
    })),
    viewer,
  };
}

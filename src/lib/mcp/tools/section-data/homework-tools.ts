import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { findActiveSuspension } from "@/features/comments/server/comment-utils";
import { withHomeworkItemState } from "@/features/homeworks/server/homework-item-state";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { getPrisma, prisma } from "@/lib/db/prisma";
import {
  getUserId,
  jsonToolResult,
  mcpLocaleInputSchema,
  mcpModeInputSchema,
  resolveMcpMode,
  resolveSectionByJwId,
} from "@/lib/mcp/tools/_helpers";
import { summarizeHomeworkCard } from "@/lib/mcp/tools/event-summary";
import { parseDateInput } from "@/lib/time/parse-date-input";
import { sectionNotFoundToolResult } from "./shared";

const homeworkToolUserSelect = {
  select: { id: true, name: true, username: true, image: true },
} as const;

function buildHomeworkToolInclude(userId?: string | null) {
  return {
    section: {
      include: {
        course: true,
        semester: true,
      },
    },
    description: true,
    createdBy: homeworkToolUserSelect,
    updatedBy: homeworkToolUserSelect,
    deletedBy: homeworkToolUserSelect,
    ...(userId
      ? {
          homeworkCompletions: {
            where: { userId },
            select: { completedAt: true },
          },
        }
      : {}),
  } as const;
}

async function getHomeworkItemById(
  homeworkId: string,
  locale: string,
  userId?: string | null,
) {
  const homework = await getPrisma(locale).homework.findUnique({
    where: { id: homeworkId },
    include: buildHomeworkToolInclude(userId),
  });
  if (!homework) {
    return null;
  }

  const [homeworkItem] = await withHomeworkItemState([homework]);
  return homeworkItem ?? null;
}

export function registerSectionHomeworkTools(server: McpServer) {
  server.registerTool(
    "list_homeworks_by_section",
    {
      description:
        "Homeworks for one section by JW ID. Includes viewer completion state when authenticated. " +
        "Use list_my_homeworks for all followed sections.",
      inputSchema: {
        sectionJwId: z.number().int().positive(),
        includeDeleted: z.boolean().default(false),
        locale: mcpLocaleInputSchema,
        mode: mcpModeInputSchema,
      },
    },
    async ({ sectionJwId, includeDeleted, locale, mode }, extra) => {
      const resolvedMode = resolveMcpMode(mode);
      const { localizedPrisma, section } = await resolveSectionByJwId(
        sectionJwId,
        locale,
      );

      if (!section) {
        return sectionNotFoundToolResult(sectionJwId, mode);
      }

      const viewerUserId =
        typeof extra.authInfo?.extra?.userId === "string"
          ? extra.authInfo.extra.userId
          : null;
      const homeworks = await localizedPrisma.homework.findMany({
        where: {
          sectionId: section.id,
          ...(includeDeleted ? {} : { deletedAt: null }),
        },
        include: buildHomeworkToolInclude(viewerUserId),
        orderBy: [{ submissionDueAt: "asc" }, { createdAt: "desc" }],
      });
      const homeworkItems = await withHomeworkItemState(homeworks);
      const scopedHomeworkItems = homeworkItems.map(
        ({
          section: _section,
          createdBy: _createdBy,
          updatedBy: _updatedBy,
          deletedBy: _deletedBy,
          ...homework
        }) => homework,
      );

      if (resolvedMode === "summary") {
        return jsonToolResult(
          {
            found: true,
            section,
            homeworks: {
              total: homeworkItems.length,
              items: scopedHomeworkItems.slice(0, 5).map(summarizeHomeworkCard),
            },
          },
          { mode: "default" },
        );
      }

      return jsonToolResult(
        {
          found: true,
          section,
          homeworks:
            resolvedMode === "full" ? homeworkItems : scopedHomeworkItems,
        },
        {
          mode: resolvedMode,
        },
      );
    },
  );

  server.registerTool(
    "create_homework_on_section",
    {
      description:
        "Create a homework under one section by section JW ID. Requires unsuspended signed-in user; does not mutate JW/import facts.",
      inputSchema: {
        sectionJwId: z.number().int().positive(),
        title: z.string().trim().min(1).max(200),
        description: z.string().max(20000).optional().nullable(),
        isMajor: z.boolean().optional(),
        requiresTeam: z.boolean().optional(),
        publishedAt: z.union([z.string(), z.null()]).optional(),
        submissionStartAt: z.union([z.string(), z.null()]).optional(),
        submissionDueAt: z.union([z.string(), z.null()]).optional(),
        locale: mcpLocaleInputSchema,
        mode: mcpModeInputSchema,
      },
    },
    async (
      {
        sectionJwId,
        title,
        description,
        isMajor,
        requiresTeam,
        publishedAt,
        submissionStartAt,
        submissionDueAt,
        locale,
        mode,
      },
      extra,
    ) => {
      const resolvedMode = resolveMcpMode(mode);
      const userId = getUserId(extra.authInfo);
      const suspension = await findActiveSuspension(userId);
      if (suspension) {
        return jsonToolResult(
          {
            success: false,
            message: "Suspended",
            reason: suspension.reason ?? null,
          },
          { mode: resolvedMode },
        );
      }

      const { section } = await resolveSectionByJwId(sectionJwId, locale);
      if (!section) {
        return jsonToolResult(
          { success: false, message: `Section ${sectionJwId} was not found` },
          { mode: resolvedMode },
        );
      }

      const parsedPublishedAt = parseDateInput(publishedAt);
      const parsedSubmissionStartAt = parseDateInput(submissionStartAt);
      const parsedSubmissionDueAt = parseDateInput(submissionDueAt);
      if (parsedPublishedAt === undefined) {
        return jsonToolResult(
          { success: false, message: "Invalid publish date" },
          { mode: resolvedMode },
        );
      }
      if (parsedSubmissionStartAt === undefined) {
        return jsonToolResult(
          { success: false, message: "Invalid submission start" },
          { mode: resolvedMode },
        );
      }
      if (parsedSubmissionDueAt === undefined) {
        return jsonToolResult(
          { success: false, message: "Invalid submission due" },
          { mode: resolvedMode },
        );
      }
      if (
        parsedSubmissionStartAt &&
        parsedSubmissionDueAt &&
        parsedSubmissionStartAt.getTime() > parsedSubmissionDueAt.getTime()
      ) {
        return jsonToolResult(
          { success: false, message: "Submission start must be before due" },
          { mode: resolvedMode },
        );
      }

      const trimmedDescription = (description ?? "").trim();
      const homework = await prisma.$transaction(async (tx) => {
        const created = await tx.homework.create({
          data: {
            sectionId: section.id,
            title,
            isMajor: isMajor === true,
            requiresTeam: requiresTeam === true,
            publishedAt: parsedPublishedAt,
            submissionStartAt: parsedSubmissionStartAt,
            submissionDueAt: parsedSubmissionDueAt,
            createdById: userId,
            updatedById: userId,
          },
        });

        if (trimmedDescription) {
          const descriptionRecord = await tx.description.create({
            data: {
              content: trimmedDescription,
              lastEditedAt: new Date(),
              lastEditedById: userId,
              homeworkId: created.id,
            },
          });
          await tx.descriptionEdit.create({
            data: {
              descriptionId: descriptionRecord.id,
              editorId: userId,
              previousContent: null,
              nextContent: trimmedDescription,
            },
          });
        }

        await tx.homeworkAuditLog.create({
          data: {
            action: "created",
            sectionId: section.id,
            homeworkId: created.id,
            actorId: userId,
            titleSnapshot: title,
          },
        });

        return created;
      });
      const homeworkItem = await getHomeworkItemById(
        homework.id,
        locale,
        userId,
      );

      return jsonToolResult(
        { success: true, id: homework.id, homework: homeworkItem },
        { mode: resolvedMode },
      );
    },
  );

  server.registerTool(
    "update_homework_on_section",
    {
      description:
        "Update a homework by ID and optionally replace/upsert its description. Requires collaborator permissions and unsuspended user.",
      inputSchema: {
        homeworkId: z.string().trim().min(1),
        title: z.string().trim().min(1).max(200).optional(),
        description: z.string().max(20000).optional().nullable(),
        isMajor: z.boolean().optional(),
        requiresTeam: z.boolean().optional(),
        publishedAt: z.union([z.string(), z.null()]).optional(),
        submissionStartAt: z.union([z.string(), z.null()]).optional(),
        submissionDueAt: z.union([z.string(), z.null()]).optional(),
        mode: mcpModeInputSchema,
      },
    },
    async (
      {
        homeworkId,
        title,
        description,
        isMajor,
        requiresTeam,
        publishedAt,
        submissionStartAt,
        submissionDueAt,
        mode,
      },
      extra,
    ) => {
      const resolvedMode = resolveMcpMode(mode);
      const userId = getUserId(extra.authInfo);
      const suspension = await findActiveSuspension(userId);
      if (suspension) {
        return jsonToolResult(
          {
            success: false,
            message: "Suspended",
            reason: suspension.reason ?? null,
          },
          { mode: resolvedMode },
        );
      }

      const hasPublishedAt = publishedAt !== undefined;
      const hasSubmissionStartAt = submissionStartAt !== undefined;
      const hasSubmissionDueAt = submissionDueAt !== undefined;

      const parsedPublishedAt = hasPublishedAt
        ? parseDateInput(publishedAt)
        : undefined;
      const parsedSubmissionStartAt = hasSubmissionStartAt
        ? parseDateInput(submissionStartAt)
        : undefined;
      const parsedSubmissionDueAt = hasSubmissionDueAt
        ? parseDateInput(submissionDueAt)
        : undefined;

      if (hasPublishedAt && parsedPublishedAt === undefined) {
        return jsonToolResult(
          { success: false, message: "Invalid publish date" },
          { mode: resolvedMode },
        );
      }
      if (hasSubmissionStartAt && parsedSubmissionStartAt === undefined) {
        return jsonToolResult(
          { success: false, message: "Invalid submission start" },
          { mode: resolvedMode },
        );
      }
      if (hasSubmissionDueAt && parsedSubmissionDueAt === undefined) {
        return jsonToolResult(
          { success: false, message: "Invalid submission due" },
          { mode: resolvedMode },
        );
      }
      if (
        parsedSubmissionStartAt &&
        parsedSubmissionDueAt &&
        parsedSubmissionStartAt.getTime() > parsedSubmissionDueAt.getTime()
      ) {
        return jsonToolResult(
          { success: false, message: "Submission start must be before due" },
          { mode: resolvedMode },
        );
      }

      const existing = await prisma.homework.findUnique({
        where: { id: homeworkId },
        select: { id: true, deletedAt: true },
      });
      if (!existing) {
        return jsonToolResult(
          { success: false, message: "Homework not found" },
          { mode: resolvedMode },
        );
      }
      if (existing.deletedAt) {
        return jsonToolResult(
          { success: false, message: "Homework deleted" },
          { mode: resolvedMode },
        );
      }

      const updates: Record<string, unknown> = { updatedById: userId };
      if (title !== undefined) updates.title = title;
      if (isMajor !== undefined) updates.isMajor = isMajor === true;
      if (requiresTeam !== undefined)
        updates.requiresTeam = requiresTeam === true;
      if (parsedPublishedAt !== undefined)
        updates.publishedAt = parsedPublishedAt;
      if (parsedSubmissionStartAt !== undefined)
        updates.submissionStartAt = parsedSubmissionStartAt;
      if (parsedSubmissionDueAt !== undefined)
        updates.submissionDueAt = parsedSubmissionDueAt;

      const wantsDescription = description !== undefined;
      const trimmedDescription = (description ?? "").trim();

      if (Object.keys(updates).length === 1 && !wantsDescription) {
        return jsonToolResult(
          { success: false, message: "No changes" },
          { mode: resolvedMode },
        );
      }

      await prisma.$transaction(async (tx) => {
        if (Object.keys(updates).length > 1) {
          await tx.homework.update({
            where: { id: homeworkId },
            data: updates,
          });
        }

        if (wantsDescription) {
          const existingDescription = await tx.description.findFirst({
            where: { homeworkId },
          });
          const previousContent = existingDescription?.content ?? null;
          if (!existingDescription && !trimmedDescription) {
            return;
          }
          if (
            existingDescription &&
            existingDescription.content === trimmedDescription
          ) {
            return;
          }
          const next = existingDescription
            ? await tx.description.update({
                where: { id: existingDescription.id },
                data: {
                  content: trimmedDescription,
                  lastEditedAt: new Date(),
                  lastEditedById: userId,
                },
              })
            : await tx.description.create({
                data: {
                  content: trimmedDescription,
                  lastEditedAt: new Date(),
                  lastEditedById: userId,
                  homeworkId,
                },
              });
          await tx.descriptionEdit.create({
            data: {
              descriptionId: next.id,
              editorId: userId,
              previousContent,
              nextContent: trimmedDescription,
            },
          });
        }
      });
      const homeworkItem = await getHomeworkItemById(
        homeworkId,
        DEFAULT_LOCALE,
        userId,
      );

      return jsonToolResult(
        { success: true, homework: homeworkItem },
        { mode: resolvedMode },
      );
    },
  );
}

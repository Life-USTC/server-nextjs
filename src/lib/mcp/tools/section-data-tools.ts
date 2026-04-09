import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { findActiveSuspension } from "@/features/comments/server/comment-utils";
import { DEFAULT_LOCALE, localeSchema } from "@/i18n/config";
import { prisma } from "@/lib/db/prisma";
import {
  getUserId,
  jsonToolResult,
  mcpModeInputSchema,
  resolveMcpMode,
  resolveSectionByJwId,
} from "@/lib/mcp/tools/_helpers";
import { parseDateInput } from "@/lib/time/parse-date-input";

export function registerSectionDataTools(server: McpServer) {
  server.registerTool(
    "list_homeworks_by_section",
    {
      description:
        "List homeworks for a section by JW ID, optionally including deleted records.",
      inputSchema: {
        sectionJwId: z.number().int().positive(),
        includeDeleted: z.boolean().default(false),
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async ({ sectionJwId, includeDeleted, locale, mode }) => {
      const { localizedPrisma, section } = await resolveSectionByJwId(
        sectionJwId,
        locale,
      );

      if (!section) {
        return jsonToolResult({
          found: false,
          message: `Section ${sectionJwId} was not found`,
        });
      }

      const homeworks = await localizedPrisma.homework.findMany({
        where: {
          sectionId: section.id,
          ...(includeDeleted ? {} : { deletedAt: null }),
        },
        include: {
          description: true,
          createdBy: {
            select: { id: true, name: true, username: true, image: true },
          },
          updatedBy: {
            select: { id: true, name: true, username: true, image: true },
          },
          deletedBy: {
            select: { id: true, name: true, username: true, image: true },
          },
        },
        orderBy: [{ submissionDueAt: "asc" }, { createdAt: "desc" }],
      });

      return jsonToolResult(
        {
          found: true,
          section,
          homeworks,
        },
        {
          mode: resolveMcpMode(mode),
        },
      );
    },
  );

  server.registerTool(
    "create_homework_on_section",
    {
      description:
        "Create one homework under a section (by section JW ID) for the authenticated user.",
      inputSchema: {
        sectionJwId: z.number().int().positive(),
        title: z.string().trim().min(1).max(200),
        description: z.string().max(20000).optional().nullable(),
        isMajor: z.boolean().optional(),
        requiresTeam: z.boolean().optional(),
        publishedAt: z.union([z.string(), z.null()]).optional(),
        submissionStartAt: z.union([z.string(), z.null()]).optional(),
        submissionDueAt: z.union([z.string(), z.null()]).optional(),
        locale: localeSchema.default(DEFAULT_LOCALE),
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

      return jsonToolResult(
        { success: true, id: homework.id },
        { mode: resolvedMode },
      );
    },
  );

  server.registerTool(
    "update_homework_on_section",
    {
      description:
        "Update one homework (by homework ID). Optionally upsert its description.",
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

      return jsonToolResult({ success: true }, { mode: resolvedMode });
    },
  );

  server.registerTool(
    "list_schedules_by_section",
    {
      description:
        "List schedules for a section by JW ID, ordered by date and start time.",
      inputSchema: {
        sectionJwId: z.number().int().positive(),
        limit: z.number().int().min(1).max(200).default(100),
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async ({ sectionJwId, limit, locale, mode }) => {
      const { localizedPrisma, section } = await resolveSectionByJwId(
        sectionJwId,
        locale,
      );

      if (!section) {
        return jsonToolResult({
          found: false,
          message: `Section ${sectionJwId} was not found`,
        });
      }

      const schedules = await localizedPrisma.schedule.findMany({
        where: { sectionId: section.id },
        include: {
          room: {
            include: {
              building: {
                include: {
                  campus: true,
                },
              },
              roomType: true,
            },
          },
          teachers: {
            include: {
              department: true,
            },
          },
          section: {
            include: {
              course: true,
            },
          },
          scheduleGroup: true,
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        take: limit,
      });

      return jsonToolResult(
        {
          found: true,
          section,
          schedules,
        },
        {
          mode: resolveMcpMode(mode),
        },
      );
    },
  );

  server.registerTool(
    "list_exams_by_section",
    {
      description:
        "List exams for a section by JW ID, including exam batch and exam rooms.",
      inputSchema: {
        sectionJwId: z.number().int().positive(),
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async ({ sectionJwId, locale, mode }) => {
      const { localizedPrisma, section } = await resolveSectionByJwId(
        sectionJwId,
        locale,
      );

      if (!section) {
        return jsonToolResult({
          found: false,
          message: `Section ${sectionJwId} was not found`,
        });
      }

      const exams = await localizedPrisma.exam.findMany({
        where: { sectionId: section.id },
        include: {
          examBatch: true,
          examRooms: true,
          section: {
            include: {
              course: true,
            },
          },
        },
        orderBy: [{ examDate: "asc" }, { startTime: "asc" }, { jwId: "asc" }],
      });

      return jsonToolResult(
        {
          found: true,
          section,
          exams,
        },
        {
          mode: resolveMcpMode(mode),
        },
      );
    },
  );
}

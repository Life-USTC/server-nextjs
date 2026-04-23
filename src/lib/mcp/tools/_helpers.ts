import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { z } from "zod";
import type { localeSchema } from "@/i18n/config";
import { getPrisma, prisma } from "@/lib/db/prisma";
import { compactMcpPayload } from "@/lib/mcp/compact-payload";
import { parseDateInput } from "@/lib/time/parse-date-input";
import { serializeDatesDeep } from "@/lib/time/serialize-date-output";
import { formatShanghaiDate } from "@/lib/time/shanghai-format";

export type Locale = z.infer<typeof localeSchema>;
export const dateTimeSchema = z.string().datetime({ offset: true });
export const sectionCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_.-]+$/);
export const todoPrioritySchema = z.enum(["low", "medium", "high"]);

export const mcpModeSchema = z.enum(["summary", "default", "full"]);
export const mcpModeInputSchema = mcpModeSchema.default("default");

export function resolveMcpMode(
  mode: z.infer<typeof mcpModeSchema> | undefined,
) {
  return mode ?? "default";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function summarizeArray(items: unknown[], limit: number) {
  return {
    total: items.length,
    items: items.slice(0, limit).map(compactMcpPayload),
  };
}

function summarizeMcpPayload(value: unknown): unknown {
  if (Array.isArray(value)) return summarizeArray(value, 10);
  if (!isRecord(value)) return value;

  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    if (key === "events" && Array.isArray(v)) {
      out.events = summarizeArray(v, 25);
      continue;
    }
    if (
      (key === "todos" ||
        key === "homeworks" ||
        key === "schedules" ||
        key === "exams" ||
        key === "courses" ||
        key === "sections") &&
      Array.isArray(v)
    ) {
      out[key] = summarizeArray(v, 10);
      continue;
    }

    if (Array.isArray(v)) {
      out[key] = summarizeArray(v, 10);
      continue;
    }
    out[key] = compactMcpPayload(v);
  }

  return out;
}

export function jsonToolResult(
  value: unknown,
  options?: { mode?: "summary" | "default" | "full" },
) {
  const mode = resolveMcpMode(options?.mode);
  const payload =
    mode === "full"
      ? value
      : mode === "summary"
        ? summarizeMcpPayload(value)
        : compactMcpPayload(value);
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(serializeDatesDeep(payload), null, 2),
      },
    ],
  };
}

export function getUserId(authInfo?: AuthInfo): string {
  const userId = authInfo?.extra?.userId;
  if (typeof userId !== "string" || userId.length === 0) {
    throw new Error("Authenticated user context is missing");
  }

  return userId;
}

export async function getViewerInfo(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      image: true,
      isAdmin: true,
    },
  });

  return user;
}

export function getTodayBounds() {
  const now = new Date();
  const todayStart = parseRequiredDateInput(formatShanghaiDate(now));
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  return { now, todayStart, tomorrowStart };
}

export function toDateTimeFromHHmm(baseDate: Date | null, hhmm: number | null) {
  if (!baseDate) return null;

  const hours = hhmm ? Math.trunc(hhmm / 100) : 0;
  const minutes = hhmm ? hhmm % 100 : 0;
  return parseRequiredDateInput(
    `${formatShanghaiDate(baseDate)}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`,
  );
}

export function parseRequiredDateInput(value: string): Date {
  const parsed = parseDateInput(value);
  if (!(parsed instanceof Date)) {
    throw new Error("Invalid date filter");
  }
  return parsed;
}

export async function resolveSectionByJwId(jwId: number, locale: Locale) {
  const localizedPrisma = getPrisma(locale);
  const section = await localizedPrisma.section.findUnique({
    where: { jwId },
    select: {
      id: true,
      jwId: true,
      code: true,
      course: {
        select: {
          jwId: true,
          code: true,
          nameCn: true,
          nameEn: true,
        },
      },
      semester: {
        select: {
          jwId: true,
          code: true,
          nameCn: true,
        },
      },
    },
  });

  return { localizedPrisma, section };
}

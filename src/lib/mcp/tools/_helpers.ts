import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import * as z from "zod";
import { DEFAULT_LOCALE, localeSchema } from "@/i18n/config";
import { getPrisma, prisma } from "@/lib/db/prisma";
import { compactMcpPayload } from "@/lib/mcp/compact-payload";
import { parseDateInput } from "@/lib/time/parse-date-input";
import { serializeDatesDeep } from "@/lib/time/serialize-date-output";
import { formatShanghaiDate } from "@/lib/time/shanghai-format";

export type Locale = z.infer<typeof localeSchema>;
export const dateTimeSchema = z.string().datetime({ offset: true });

/**
 * Flexible date input schema for MCP tool parameters.
 * Accepts ISO 8601 with timezone offset (e.g. 2026-05-01T08:00:00+08:00),
 * date-only strings (e.g. 2026-05-01, treated as UTC midnight for @db.Date columns),
 * or datetime without timezone (e.g. 2026-05-01T08:00:00, interpreted as Asia/Shanghai).
 * Invalid strings are rejected at the handler level via parseDateInput.
 */
export const flexDateInputSchema = z
  .string()
  .trim()
  .min(1)
  .describe(
    "Accepts ISO 8601 with offset (2026-05-01T08:00:00+08:00), date-only (2026-05-01), or datetime without timezone (2026-05-01T08:00:00, interpreted as Asia/Shanghai).",
  );
export const sectionCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_.-]+$/);
export const todoPrioritySchema = z.enum(["low", "medium", "high"]);

export const mcpModeSchema = z.enum(["summary", "default", "full"]);
export const mcpModeInputSchema = mcpModeSchema
  .default("default")
  .describe(
    "Output verbosity. summary=counts+top samples (smallest, good for quick checks). " +
      "default=compact structured data with low-value fields stripped (recommended for most calls). " +
      "full=complete raw records (use only when exact nested values are explicitly required).",
  );

/**
 * Locale for localized names (course, section, teacher display names).
 * Use zh-cn for Chinese names (default, matches most USTC data).
 * Use en-us for English names where available.
 */
export const mcpLocaleInputSchema = localeSchema
  .default(DEFAULT_LOCALE)
  .describe(
    "Language for localized names: zh-cn (Chinese, default) or en-us (English).",
  );

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
    if (Array.isArray(v)) {
      out[key] = summarizeArray(v, key === "events" ? 25 : 10);
    } else {
      out[key] = compactMcpPayload(v);
    }
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

/**
 * Returns today's bounds in Asia/Shanghai calendar time.
 * Pass `atTime` to override the current time — useful for reproducible tests
 * and AI assistant queries anchored to a specific moment.
 */
export function getTodayBounds(atTime?: Date) {
  const now = atTime ?? new Date();
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

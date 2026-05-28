import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import * as z from "zod";
import { DEFAULT_LOCALE, localeSchema } from "@/i18n/config";
import { getPrisma, prisma } from "@/lib/db/prisma";
import { compactMcpPayload } from "@/lib/mcp/compact-payload";
import { parseDateInput } from "@/lib/time/parse-date-input";
import { serializeDatesDeep } from "@/lib/time/serialize-date-output";
import {
  formatShanghaiDate,
  startOfShanghaiDay,
} from "@/lib/time/shanghai-format";
import { isRecord } from "@/lib/utils";

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

function summarizeArray(items: unknown[], limit: number) {
  const returned = items.length;
  return {
    total: returned,
    returned,
    remaining: Math.max(returned - limit, 0),
    truncated: returned > limit,
    items: items.slice(0, limit).map(compactMcpPayload),
  };
}

function getPaginatedTotal(
  key: string,
  source: Record<string, unknown>,
): number | undefined {
  if (key !== "data") {
    return undefined;
  }

  const pagination = source.pagination;
  if (!isRecord(pagination) || typeof pagination.total !== "number") {
    return undefined;
  }

  return pagination.total;
}

function summarizeMcpPayload(value: unknown): unknown {
  if (Array.isArray(value)) return summarizeArray(value, 10);
  if (!isRecord(value)) return value;

  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    if (Array.isArray(v)) {
      const sampleLimit = key === "events" ? 25 : 10;
      const total = getPaginatedTotal(key, value);
      out[key] = {
        ...summarizeArray(v, sampleLimit),
        ...(total !== undefined ? { total } : {}),
      };
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

export type OptionalFieldDateParseResult =
  | {
      ok: true;
      value: Date | null | undefined;
    }
  | {
      ok: false;
      result: ReturnType<typeof jsonToolResult>;
    };

/**
 * Parse an optional date field for MCP tool mutations.
 *
 * - `undefined` → field not provided (skip, return undefined)
 * - `null`      → explicitly clear the field (return null)
 * - string     → parse via parseOptionalMcpDate; return error if invalid
 *
 * Pass `shouldParse=false` when the field wasn't in the input schema
 * to short-circuit without parsing.
 */
export function parseOptionalFieldDate(
  fieldName: string,
  value: string | null | undefined,
  shouldParse = true,
): OptionalFieldDateParseResult {
  if (!shouldParse) {
    return { ok: true, value: undefined };
  }
  if (value === null) {
    return { ok: true, value: null };
  }

  const parsed = parseOptionalMcpDate(fieldName, value);
  if (!parsed.ok) {
    return parsed;
  }

  return { ok: true, value: parsed.value ?? null };
}

type OptionalMcpDateParseOptions = {
  dateOnlyAsShanghaiStart?: boolean;
};

type McpDateParseFailure = {
  ok: false;
  result: ReturnType<typeof jsonToolResult>;
};

type OptionalMcpDate =
  | {
      ok: true;
      value?: Date;
      dateOnly: boolean;
    }
  | McpDateParseFailure;

type McpDateRange =
  | {
      ok: true;
      dateFrom?: Date;
      dateTo?: Date;
      dateFromIsDateOnly: boolean;
      dateToIsDateOnly: boolean;
    }
  | McpDateParseFailure;

const MCP_DATE_FILTER_USAGE = "Use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS+08:00.";
const DATE_ONLY_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isDateOnlyInput(value: unknown) {
  return (
    typeof value === "string" && DATE_ONLY_INPUT_PATTERN.test(value.trim())
  );
}

export function parseOptionalMcpDate(
  name: string,
  value?: string,
  options: OptionalMcpDateParseOptions = {},
): OptionalMcpDate {
  if (!value) {
    return { ok: true, dateOnly: false };
  }

  const parsed = parseDateInput(value);
  if (!(parsed instanceof Date)) {
    return {
      ok: false,
      result: jsonToolResult({
        success: false,
        message: `Invalid ${name}: "${value}". ${MCP_DATE_FILTER_USAGE}`,
      }),
    };
  }

  const dateOnly = isDateOnlyInput(value);
  return {
    ok: true,
    value:
      dateOnly && options.dateOnlyAsShanghaiStart
        ? startOfShanghaiDay(parsed)
        : parsed,
    dateOnly,
  };
}

type McpDateRangeInput = {
  dateFrom?: string;
  dateTo?: string;
};

export function parseMcpDateRange({
  dateFrom,
  dateTo,
}: McpDateRangeInput): McpDateRange {
  const parsedDateFrom = parseOptionalMcpDate("dateFrom", dateFrom);
  if (!parsedDateFrom.ok) {
    return parsedDateFrom;
  }

  const parsedDateTo = parseOptionalMcpDate("dateTo", dateTo);
  if (!parsedDateTo.ok) {
    return parsedDateTo;
  }

  return {
    ok: true,
    dateFrom: parsedDateFrom.value,
    dateTo: parsedDateTo.value,
    dateFromIsDateOnly: parsedDateFrom.dateOnly,
    dateToIsDateOnly: parsedDateTo.dateOnly,
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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      image: true,
      isAdmin: true,
    },
  });

  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

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

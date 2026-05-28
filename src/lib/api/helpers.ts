import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { resourceIdPathParamsSchema } from "@/lib/api/schemas/request-schemas";
import { logRouteFailure } from "@/lib/log/app-logger";
import { serializeDatesDeep } from "@/lib/time/serialize-date-output";
import { parseInteger, parseIntegerList } from "./request-integers";

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type PaginationInput = {
  page?: number | string | null;
  pageSize?: number | string | null;
  defaultPage?: number;
  defaultPageSize?: number;
  maxPageSize?: number;
};

type PaginationOptions = Pick<
  PaginationInput,
  "defaultPage" | "defaultPageSize" | "maxPageSize"
> & {
  pageParam?: string;
  pageSizeParam?: string;
};

type ParseRouteOptions = {
  logErrors?: boolean;
};

type ParseRouteQueryOptions = ParseRouteOptions & {
  pagination?: PaginationOptions;
};

/**
 * Normalize pagination values from query params or parsed route input.
 */
export function normalizePagination(input: PaginationInput = {}) {
  const page = Math.max(parseInteger(input.page) ?? input.defaultPage ?? 1, 1);
  const pageSize = Math.min(
    Math.max(parseInteger(input.pageSize) ?? input.defaultPageSize ?? 20, 1),
    input.maxPageSize ?? 100,
  );
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
  };
}

/**
 * Build a standard `{ data, pagination }` API response envelope.
 */
export function buildPaginatedResponse<T>(
  data: T[],
  page: number,
  pageSize: number,
  total: number,
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export function handleRouteError(
  message: string,
  error: unknown,
  status = 500,
) {
  logRouteFailure(message, status, error, { source: "route-handler" });
  return errorResponse(message, status);
}

export function errorResponse(message: string, status: number) {
  return jsonResponse({ error: message }, { status });
}

export function jsonResponse(body: unknown, init?: ResponseInit) {
  return NextResponse.json(serializeDatesDeep(body), init);
}

export function getRequestSearchParams(request: Request | NextRequest) {
  if ("nextUrl" in request) {
    return request.nextUrl.searchParams;
  }

  return new URL(request.url).searchParams;
}

export function badRequest(message: string) {
  return errorResponse(message, 400);
}

export function unauthorized(message = "Unauthorized") {
  return errorResponse(message, 401);
}

export function forbidden(message = "Forbidden") {
  return errorResponse(message, 403);
}

export function suspensionForbidden(reason?: string | null) {
  return jsonResponse(
    { error: "Suspended", reason: reason ?? null },
    { status: 403 },
  );
}

export function notFound(message = "Not found") {
  return errorResponse(message, 404);
}

export function payloadTooLarge(message = "Payload too large") {
  return errorResponse(message, 413);
}

export function invalidParamResponse(paramName: string) {
  return badRequest(`Invalid ${paramName}`);
}

function routeValidationResponse(
  message: string,
  error: unknown,
  options?: ParseRouteOptions,
) {
  if (options?.logErrors) {
    return handleRouteError(message, error, 400);
  }

  return badRequest(message);
}

export function parseRouteInput<TSchema extends z.ZodTypeAny>(
  input: unknown,
  schema: TSchema,
  message: string,
  options?: ParseRouteOptions,
): z.output<TSchema> | Response {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return routeValidationResponse(message, parsed.error, options);
  }

  return parsed.data;
}

function searchParamsInput<TSchema extends z.ZodObject>(
  searchParams: URLSearchParams,
  schema: TSchema,
) {
  return Object.fromEntries(
    Object.keys(schema.shape).map((key) => [
      key,
      searchParams.get(key) ?? undefined,
    ]),
  );
}

export function parseRouteSearchParams<TSchema extends z.ZodObject>(
  searchParams: URLSearchParams,
  schema: TSchema,
  message: string,
  options?: ParseRouteOptions,
): z.output<TSchema> | Response {
  return parseRouteInput(
    searchParamsInput(searchParams, schema),
    schema,
    message,
    options,
  );
}

export function parseRouteQuery<TSchema extends z.ZodObject>(
  searchParams: URLSearchParams,
  schema: TSchema,
  message: string,
  options?: ParseRouteQueryOptions,
):
  | {
      query: z.output<TSchema>;
      pagination: ReturnType<typeof normalizePagination>;
    }
  | Response {
  const query = parseRouteSearchParams(searchParams, schema, message, options);
  if (query instanceof Response) {
    return query;
  }

  return {
    query,
    pagination: normalizePagination({
      page: searchParams.get(options?.pagination?.pageParam ?? "page"),
      pageSize: searchParams.get(options?.pagination?.pageSizeParam ?? "limit"),
      defaultPage: options?.pagination?.defaultPage,
      defaultPageSize: options?.pagination?.defaultPageSize,
      maxPageSize: options?.pagination?.maxPageSize,
    }),
  };
}

export async function parseRouteParams<TSchema extends z.ZodTypeAny>(
  params: Promise<unknown>,
  schema: TSchema,
  message: string,
  options?: ParseRouteOptions,
): Promise<z.output<TSchema> | Response> {
  return parseRouteInput(await params, schema, message, options);
}

export async function parseRouteJsonBody<TSchema extends z.ZodTypeAny>(
  request: Request,
  schema: TSchema,
  message: string,
  options?: ParseRouteOptions,
): Promise<z.output<TSchema> | Response> {
  let body: unknown = {};

  try {
    body = await request.json();
  } catch (error) {
    return routeValidationResponse(message, error, {
      ...options,
      logErrors: true,
    });
  }

  return parseRouteInput(body, schema, message, {
    ...options,
    logErrors: options?.logErrors ?? true,
  });
}

/**
 * Parse a `[id]` path param using the canonical resourceIdPathParamsSchema.
 * Replaces duplicated parseCommentId / parseHomeworkId / parseTodoId / parseUploadId helpers.
 */
export async function parseResourceIdParam(
  params: Promise<{ id: string }>,
  label: string,
): Promise<string | Response> {
  const parsed = await parseRouteParams(
    params,
    resourceIdPathParamsSchema,
    `Invalid ${label} ID`,
  );
  if (parsed instanceof Response) {
    return parsed;
  }

  return parsed.id;
}

export { parseInteger, parseIntegerList };

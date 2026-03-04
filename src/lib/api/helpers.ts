import { NextResponse } from "next/server";

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type PaginationInput = {
  page?: number;
  pageSize?: number;
  maxPageSize?: number;
};

/**
 * Normalize and validate pagination parameters
 */
export function normalizePagination(input: PaginationInput = {}) {
  const page = Math.max(input.page ?? 1, 1);
  const pageSize = Math.min(
    Math.max(input.pageSize ?? 20, 1),
    input.maxPageSize ?? 100,
  );
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
  };
}

/**
 * Parse pagination from URL search params
 */
export function getPagination(searchParams: URLSearchParams) {
  return normalizePagination({
    page: parseOptionalInt(searchParams.get("page")) ?? undefined,
    pageSize: parseOptionalInt(searchParams.get("limit")) ?? undefined,
    maxPageSize: 100,
  });
}

/**
 * Build paginated response object
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
  console.error(message, error);
  return errorResponse(message, status);
}

export function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
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

export function notFound(message = "Not found") {
  return errorResponse(message, 404);
}

export function payloadTooLarge(message = "Payload too large") {
  return errorResponse(message, 413);
}

export function parseInteger(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!normalized || !/^-?\d+$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function parseOptionalInt(value: unknown): number | null {
  return parseInteger(value);
}

export function parseIntegerList(value: unknown, separator = ","): number[] {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(separator)
    .map((entry) => parseInteger(entry))
    .filter((entry): entry is number => entry !== null);
}

export function invalidParamResponse(paramName: string) {
  return badRequest(`Invalid ${paramName}`);
}

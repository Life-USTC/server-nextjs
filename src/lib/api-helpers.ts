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
    page: parseInt(searchParams.get("page") || "", 10) || undefined,
    pageSize: parseInt(searchParams.get("limit") || "", 10) || undefined,
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
  return NextResponse.json({ error: message }, { status });
}

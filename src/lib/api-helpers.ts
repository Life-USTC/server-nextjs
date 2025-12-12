import { NextResponse } from "next/server";

export type PaginationParams = {
  page: number;
  limit: number;
  skip: number;
};

type PaginationDefaults = {
  page?: number;
  limit?: number;
  maxLimit?: number;
};

export function getPagination(
  searchParams: URLSearchParams,
  defaults: PaginationDefaults = {},
): PaginationParams {
  const page = Math.max(
    parseInt(searchParams.get("page") || "", 10) || defaults.page || 1,
    1,
  );
  const requestedLimit =
    parseInt(searchParams.get("limit") || "", 10) || defaults.limit || 30;
  const limit = Math.min(Math.max(requestedLimit, 1), defaults.maxLimit || 100);
  return { page, limit, skip: (page - 1) * limit };
}

export function paginateResult<T>(
  data: T,
  pagination: PaginationParams,
  total: number,
) {
  return NextResponse.json({
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      pages: Math.ceil(total / pagination.limit),
    },
  });
}

export function handleRouteError(
  message: string,
  error: unknown,
  status = 500,
) {
  console.error(message, error);
  return NextResponse.json({ error: message }, { status });
}

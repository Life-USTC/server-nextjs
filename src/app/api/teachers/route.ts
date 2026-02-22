import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import {
  getPagination,
  handleRouteError,
  parseOptionalInt,
} from "@/lib/api-helpers";
import { teachersQuerySchema } from "@/lib/api-schemas/request-schemas";
import { paginatedTeacherQuery } from "@/lib/query-helpers";

export const dynamic = "force-dynamic";

/**
 * List teachers with department/search filters.
 * @params teachersQuerySchema
 * @response paginatedTeacherResponseSchema
 * @response 400:openApiErrorSchema
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const parsedQuery = teachersQuerySchema.safeParse({
    departmentId: searchParams.get("departmentId") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!parsedQuery.success) {
    return handleRouteError("Invalid teacher query", parsedQuery.error, 400);
  }

  const pagination = getPagination(searchParams);
  const { departmentId, search } = parsedQuery.data;

  const where: Prisma.TeacherWhereInput = {};

  if (departmentId) {
    const parsedDepartmentId = parseOptionalInt(departmentId);
    if (parsedDepartmentId !== null) {
      where.departmentId = parsedDepartmentId;
    }
  }

  if (search) {
    where.OR = [
      { nameCn: { contains: search, mode: "insensitive" } },
      { nameEn: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const result = await paginatedTeacherQuery(pagination.page, where, {
      nameCn: "asc",
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError("Failed to fetch teachers", error);
  }
}

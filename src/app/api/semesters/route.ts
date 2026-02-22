import { type NextRequest, NextResponse } from "next/server";
import {
  buildPaginatedResponse,
  getPagination,
  handleRouteError,
} from "@/lib/api-helpers";
import { semestersQuerySchema } from "@/lib/api-schemas/request-schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * List semesters with pagination.
 * @params semestersQuerySchema
 * @response paginatedSemesterResponseSchema
 * @response 400:openApiErrorSchema
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const parsedQuery = semestersQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });
    if (!parsedQuery.success) {
      return handleRouteError("Invalid semester query", parsedQuery.error, 400);
    }
    const { page, pageSize, skip } = getPagination(searchParams);

    const [semesters, total] = await Promise.all([
      prisma.semester.findMany({
        skip,
        take: pageSize,
        orderBy: { startDate: "desc" },
      }),
      prisma.semester.count(),
    ]);

    return NextResponse.json(
      buildPaginatedResponse(semesters, page, pageSize, total),
    );
  } catch (error) {
    return handleRouteError("Failed to fetch semesters", error);
  }
}

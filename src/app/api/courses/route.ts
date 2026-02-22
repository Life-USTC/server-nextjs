import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { getPagination, handleRouteError } from "@/lib/api-helpers";
import { coursesQuerySchema } from "@/lib/api-schemas";
import { paginatedCourseQuery } from "@/lib/query-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const parsedQuery = coursesQuerySchema.safeParse({
    search: searchParams.get("search") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!parsedQuery.success) {
    return handleRouteError("Invalid course query", parsedQuery.error, 400);
  }

  const pagination = getPagination(searchParams);
  const search = parsedQuery.data.search;

  const where: Prisma.CourseWhereInput | undefined = search
    ? {
        OR: [
          {
            nameCn: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
          {
            nameEn: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
          { code: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  try {
    const result = await paginatedCourseQuery(pagination.page, where);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError("Failed to fetch courses", error);
  }
}

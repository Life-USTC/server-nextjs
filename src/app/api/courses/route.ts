import type { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPagination, handleRouteError } from "@/lib/api-helpers";
import { paginatedCourseQuery } from "@/lib/query-helpers";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pagination = getPagination(searchParams);
  const search = searchParams.get("search")?.trim();

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

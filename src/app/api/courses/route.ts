import type { NextRequest } from "next/server";
import {
  getPagination,
  handleRouteError,
  paginateResult,
} from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pagination = getPagination(searchParams);
  const search = searchParams.get("search")?.trim();

  const whereClause = search
    ? {
        OR: [
          { nameCn: { contains: search, mode: "insensitive" as const } },
          { nameEn: { contains: search, mode: "insensitive" as const } },
          { code: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  try {
    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where: whereClause,
        skip: pagination.skip,
        take: pagination.limit,
        include: {
          educationLevel: true,
          category: true,
          classify: true,
          classType: true,
          gradation: true,
          type: true,
        },
      }),
      prisma.course.count({ where: whereClause }),
    ]);

    return paginateResult(courses, pagination, total);
  } catch (error) {
    return handleRouteError("Failed to fetch courses", error);
  }
}

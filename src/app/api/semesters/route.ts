import { type NextRequest, NextResponse } from "next/server";
import {
  buildPaginatedResponse,
  getPagination,
  handleRouteError,
} from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
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

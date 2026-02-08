import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { getPagination, handleRouteError } from "@/lib/api-helpers";
import { paginatedTeacherQuery } from "@/lib/query-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pagination = getPagination(searchParams);

  const departmentId = searchParams.get("departmentId");
  const search = searchParams.get("search");

  const where: Prisma.TeacherWhereInput = {};

  if (departmentId) {
    const parsedDepartmentId = parseInt(departmentId, 10);
    if (!Number.isNaN(parsedDepartmentId)) {
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

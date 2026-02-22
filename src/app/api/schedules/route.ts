import { type NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import {
  buildPaginatedResponse,
  getPagination,
  handleRouteError,
  parseOptionalInt,
} from "@/lib/api-helpers";
import { schedulesQuerySchema } from "@/lib/api-schemas/request-schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * List schedules with filters and pagination.
 * @params schedulesQuerySchema
 * @response paginatedScheduleResponseSchema
 * @response 400:openApiErrorSchema
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const parsedQuery = schedulesQuerySchema.safeParse({
      sectionId: searchParams.get("sectionId") ?? undefined,
      teacherId: searchParams.get("teacherId") ?? undefined,
      roomId: searchParams.get("roomId") ?? undefined,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
      weekday: searchParams.get("weekday") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });
    if (!parsedQuery.success) {
      return handleRouteError("Invalid schedule query", parsedQuery.error, 400);
    }

    const pagination = getPagination(searchParams);
    const { sectionId, teacherId, roomId, dateFrom, dateTo, weekday } =
      parsedQuery.data;

    const whereClause: Prisma.ScheduleWhereInput = {};
    const parsedSectionId = parseOptionalInt(sectionId);
    if (parsedSectionId !== null) whereClause.sectionId = parsedSectionId;
    if (teacherId) {
      const parsedTeacherId = parseOptionalInt(teacherId);
      if (parsedTeacherId !== null) {
        whereClause.teachers = {
          some: {
            id: parsedTeacherId,
          },
        };
      }
    }
    const parsedRoomId = parseOptionalInt(roomId);
    if (parsedRoomId !== null) whereClause.roomId = parsedRoomId;
    const dateFilter: Prisma.DateTimeFilter = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);
    if (dateFrom || dateTo) whereClause.date = dateFilter;
    if (weekday !== null && weekday !== undefined) {
      const parsedWeekday = parseOptionalInt(weekday);
      if (parsedWeekday !== null) {
        whereClause.weekday = parsedWeekday;
      }
    }

    const [schedules, total] = await Promise.all([
      prisma.schedule.findMany({
        where: whereClause,
        skip: pagination.skip,
        take: pagination.pageSize,
        include: {
          room: {
            include: {
              building: {
                include: {
                  campus: true,
                },
              },
              roomType: true,
            },
          },
          teachers: {
            include: {
              department: true,
            },
          },
          section: {
            include: {
              course: true,
            },
          },
          scheduleGroup: true,
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      }),
      prisma.schedule.count({ where: whereClause }),
    ]);

    return NextResponse.json(
      buildPaginatedResponse(
        schedules,
        pagination.page,
        pagination.pageSize,
        total,
      ),
    );
  } catch (error) {
    return handleRouteError("Failed to fetch schedules", error);
  }
}

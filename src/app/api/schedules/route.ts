import { type NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import {
  buildPaginatedResponse,
  getPagination,
  handleRouteError,
  parseOptionalInt,
} from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pagination = getPagination(searchParams);

    const sectionId = searchParams.get("sectionId");
    const teacherId = searchParams.get("teacherId");
    const roomId = searchParams.get("roomId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const weekday = searchParams.get("weekday");

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

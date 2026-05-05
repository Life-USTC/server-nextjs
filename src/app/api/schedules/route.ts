import type { NextRequest } from "next/server";
import {
  buildPaginatedResponse,
  getPagination,
  handleRouteError,
  jsonResponse,
} from "@/lib/api/helpers";
import { schedulesQuerySchema } from "@/lib/api/schemas/request-schemas";
import { getPrisma, prisma } from "@/lib/db/prisma";
import {
  buildScheduleListWhere,
  publicScheduleInclude,
} from "@/lib/schedule-queries";
import { parseDateInput } from "@/lib/time/parse-date-input";
import { formatTime } from "@/shared/lib/time-utils";
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
      sectionJwId: searchParams.get("sectionJwId") ?? undefined,
      sectionCode: searchParams.get("sectionCode") ?? undefined,
      teacherId: searchParams.get("teacherId") ?? undefined,
      teacherCode: searchParams.get("teacherCode") ?? undefined,
      roomId: searchParams.get("roomId") ?? undefined,
      roomJwId: searchParams.get("roomJwId") ?? undefined,
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
    const {
      sectionId,
      sectionJwId,
      sectionCode,
      teacherId,
      teacherCode,
      roomId,
      roomJwId,
      dateFrom,
      dateTo,
      weekday,
    } = parsedQuery.data;

    let parsedDateFrom: Date | undefined;
    if (dateFrom) {
      const nextDateFrom = parseDateInput(dateFrom);
      if (!(nextDateFrom instanceof Date)) {
        return handleRouteError(
          "Invalid schedule query",
          "Invalid dateFrom",
          400,
        );
      }
      parsedDateFrom = nextDateFrom;
    }
    let parsedDateTo: Date | undefined;
    if (dateTo) {
      const nextDateTo = parseDateInput(dateTo);
      if (!(nextDateTo instanceof Date)) {
        return handleRouteError(
          "Invalid schedule query",
          "Invalid dateTo",
          400,
        );
      }
      parsedDateTo = nextDateTo;
    }
    const whereClause = buildScheduleListWhere({
      sectionId,
      sectionJwId,
      sectionCode,
      teacherId,
      teacherCode,
      roomId,
      roomJwId,
      weekday,
      dateFrom: parsedDateFrom,
      dateTo: parsedDateTo,
    });

    const localizedPrisma = getPrisma("zh-cn");
    const [schedules, total] = await Promise.all([
      localizedPrisma.schedule.findMany({
        where: whereClause,
        skip: pagination.skip,
        take: pagination.pageSize,
        include: publicScheduleInclude,
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      }),
      prisma.schedule.count({ where: whereClause }),
    ]);

    return jsonResponse(
      buildPaginatedResponse(
        schedules.map((schedule: (typeof schedules)[number]) => ({
          ...schedule,
          startTime: formatTime(schedule.startTime),
          endTime: formatTime(schedule.endTime),
        })),
        pagination.page,
        pagination.pageSize,
        total,
      ),
    );
  } catch (error) {
    return handleRouteError("Failed to fetch schedules", error);
  }
}

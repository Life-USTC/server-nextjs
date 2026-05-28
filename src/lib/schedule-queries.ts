import type { Prisma } from "@/generated/prisma/client";
import {
  applyIntegerFilter,
  buildJwIdFilter,
  buildRelatedFilter,
  type IntegerFilter,
} from "@/lib/query-filter-helpers";

type ScheduleListFilters = {
  sectionId?: IntegerFilter;
  sectionJwId?: IntegerFilter;
  sectionCode?: string | null;
  teacherId?: IntegerFilter;
  teacherCode?: string | null;
  roomId?: IntegerFilter;
  roomJwId?: IntegerFilter;
  weekday?: IntegerFilter;
  dateFrom?: Date;
  dateTo?: Date;
};

export const publicScheduleInclude = {
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
      semester: true,
    },
  },
  scheduleGroup: true,
} as const;

export function buildScheduleListWhere(filters: ScheduleListFilters) {
  const {
    sectionId,
    sectionJwId,
    sectionCode,
    teacherId,
    teacherCode,
    roomId,
    roomJwId,
    weekday,
    dateFrom,
    dateTo,
  } = filters;

  const where: Prisma.ScheduleWhereInput = {};

  applyIntegerFilter(where, "sectionId", sectionId);

  const sectionFilter = buildRelatedFilter("jwId", sectionJwId, sectionCode);
  if (sectionFilter) {
    where.section = sectionFilter;
  }

  const teacherFilter = buildRelatedFilter("id", teacherId, teacherCode);
  if (teacherFilter) {
    where.teachers = { some: teacherFilter };
  }

  applyIntegerFilter(where, "roomId", roomId);

  const roomFilter = buildJwIdFilter(roomJwId);
  if (roomFilter) {
    where.room = roomFilter;
  }

  if (dateFrom || dateTo) {
    where.date = {
      ...(dateFrom && { gte: dateFrom }),
      ...(dateTo && { lte: dateTo }),
    };
  }

  applyIntegerFilter(where, "weekday", weekday);

  return where;
}

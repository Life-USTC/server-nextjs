type IntegerFilter = number | string | null | undefined;

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

function parseIntegerFilter(value: IntegerFilter) {
  if (typeof value === "number") {
    return Number.isInteger(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

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

  const where: {
    sectionId?: number;
    section?: { jwId?: number; code?: string };
    teachers?: { some: { id?: number; code?: string } };
    roomId?: number;
    room?: { jwId?: number };
    date?: { gte?: Date; lte?: Date };
    weekday?: number;
  } = {};

  const parsedSectionId = parseIntegerFilter(sectionId);
  if (parsedSectionId !== null) {
    where.sectionId = parsedSectionId;
  }

  const sectionFilter: { jwId?: number; code?: string } = {};
  const parsedSectionJwId = parseIntegerFilter(sectionJwId);
  if (parsedSectionJwId !== null) {
    sectionFilter.jwId = parsedSectionJwId;
  }
  const trimmedSectionCode = sectionCode?.trim();
  if (trimmedSectionCode) {
    sectionFilter.code = trimmedSectionCode;
  }
  if (Object.keys(sectionFilter).length > 0) {
    where.section = sectionFilter;
  }

  const teacherFilter: { id?: number; code?: string } = {};
  const parsedTeacherId = parseIntegerFilter(teacherId);
  if (parsedTeacherId !== null) {
    teacherFilter.id = parsedTeacherId;
  }
  const trimmedTeacherCode = teacherCode?.trim();
  if (trimmedTeacherCode) {
    teacherFilter.code = trimmedTeacherCode;
  }
  if (Object.keys(teacherFilter).length > 0) {
    where.teachers = {
      some: teacherFilter,
    };
  }

  const parsedRoomId = parseIntegerFilter(roomId);
  if (parsedRoomId !== null) {
    where.roomId = parsedRoomId;
  }

  const roomFilter: { jwId?: number } = {};
  const parsedRoomJwId = parseIntegerFilter(roomJwId);
  if (parsedRoomJwId !== null) {
    roomFilter.jwId = parsedRoomJwId;
  }
  if (Object.keys(roomFilter).length > 0) {
    where.room = roomFilter;
  }

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (dateFrom) {
    dateFilter.gte = dateFrom;
  }
  if (dateTo) {
    dateFilter.lte = dateTo;
  }
  if (dateFrom || dateTo) {
    where.date = dateFilter;
  }

  const parsedWeekday = parseIntegerFilter(weekday);
  if (parsedWeekday !== null) {
    where.weekday = parsedWeekday;
  }

  return where;
}

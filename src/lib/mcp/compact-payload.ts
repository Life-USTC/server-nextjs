function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord);
}

function pick<T extends Record<string, unknown>, K extends keyof T>(
  value: T,
  keys: readonly K[],
): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const key of keys) {
    if (Object.hasOwn(value, key) && value[key] !== undefined) {
      out[key] = value[key];
    }
  }
  return out;
}

export function redactCalendarFeedLocation(value: string | null | undefined) {
  if (!value) return value ?? null;
  return value.replace(
    /(\/api\/users\/[^/:]+:)([^/?#]+)(\/calendar\.ics)/,
    "$1[redacted]$3",
  );
}

export function compactUser(value: unknown) {
  if (!isRecord(value)) return value;
  return pick(value, ["id", "name", "username", "image"]);
}

export function compactDepartment(value: unknown) {
  if (!isRecord(value)) return value;
  return pick(value, [
    "id",
    "nameCn",
    "nameEn",
    "namePrimary",
    "nameSecondary",
  ]);
}

export function compactTeacherTitle(value: unknown) {
  if (!isRecord(value)) return value;
  return pick(value, [
    "id",
    "nameCn",
    "nameEn",
    "namePrimary",
    "nameSecondary",
  ]);
}

export function compactCourse(value: unknown) {
  if (!isRecord(value)) return value;
  return pick(value, [
    "id",
    "jwId",
    "code",
    "nameCn",
    "nameEn",
    "namePrimary",
    "nameSecondary",
    "credit",
    "hours",
  ]);
}

export function compactSemester(value: unknown) {
  if (!isRecord(value)) return value;
  return pick(value, [
    "id",
    "jwId",
    "code",
    "nameCn",
    "namePrimary",
    "startDate",
    "endDate",
  ]);
}

export function compactCampus(
  value: unknown,
  options?: {
    includeCoordinates?: boolean;
  },
) {
  if (!isRecord(value)) return value;
  const out: Record<string, unknown> = pick(value, [
    "id",
    "nameCn",
    "nameEn",
    "namePrimary",
    "nameSecondary",
  ]);
  if (options?.includeCoordinates) {
    if (Object.hasOwn(value, "latitude")) out.latitude = value.latitude;
    if (Object.hasOwn(value, "longitude")) out.longitude = value.longitude;
  }
  return out;
}

export function compactTeacher(value: unknown) {
  if (!isRecord(value)) return value;
  const out: Record<string, unknown> = pick(value, [
    "id",
    "personId",
    "teacherId",
    "code",
    "jwId",
    "nameCn",
    "nameEn",
    "namePrimary",
    "nameSecondary",
  ]);
  if (Object.hasOwn(value, "department")) {
    out.department = compactDepartment(value.department);
  }
  if (Object.hasOwn(value, "teacherTitle")) {
    out.teacherTitle = compactTeacherTitle(value.teacherTitle);
  }
  if (Object.hasOwn(value, "_count")) {
    out._count = value._count;
  }
  if (Object.hasOwn(value, "sections") && Array.isArray(value.sections)) {
    out.sections = asRecordArray(value.sections).map(compactSection);
  }
  return out;
}

export function compactSection(value: unknown) {
  if (!isRecord(value)) return value;
  const out: Record<string, unknown> = pick(value, [
    "id",
    "jwId",
    "code",
    "namePrimary",
    "nameSecondary",
    "campusId",
    "openDepartmentId",
  ]);
  if (Object.hasOwn(value, "course")) out.course = compactCourse(value.course);
  if (Object.hasOwn(value, "semester")) {
    out.semester = compactSemester(value.semester);
  }
  if (Object.hasOwn(value, "campus")) {
    out.campus = compactCampus(value.campus);
  }
  if (Object.hasOwn(value, "openDepartment")) {
    out.openDepartment = compactDepartment(value.openDepartment);
  }
  if (Object.hasOwn(value, "teachers") && Array.isArray(value.teachers)) {
    out.teachers = asRecordArray(value.teachers).map(compactTeacher);
  }
  return out;
}

export function compactTodo(value: unknown) {
  if (!isRecord(value)) return value;
  const out: Record<string, unknown> = pick(value, [
    "id",
    "title",
    "priority",
    "dueAt",
    "completed",
    "createdAt",
    "updatedAt",
  ]);
  if (!value.completed && Object.hasOwn(value, "content")) {
    out.content = value.content;
  }
  return out;
}

export function compactHomework(value: unknown) {
  if (!isRecord(value)) return value;
  const out: Record<string, unknown> = pick(value, [
    "id",
    "sectionId",
    "title",
    "isMajor",
    "requiresTeam",
    "publishedAt",
    "submissionStartAt",
    "submissionDueAt",
    "deletedAt",
    "createdAt",
    "updatedAt",
  ]);

  if (Object.hasOwn(value, "description")) {
    if (isRecord(value.description)) {
      out.description = pick(value.description, [
        "id",
        "content",
        "lastEditedAt",
        "lastEditedById",
      ]);
    } else {
      out.description = value.description;
    }
  }
  if (Object.hasOwn(value, "completion")) out.completion = value.completion;
  if (Object.hasOwn(value, "commentCount"))
    out.commentCount = value.commentCount;
  if (Object.hasOwn(value, "homeworkCompletions")) {
    out.homeworkCompletions = value.homeworkCompletions;
  }
  if (Object.hasOwn(value, "section")) {
    out.section = compactSection(value.section);
  }
  if (Object.hasOwn(value, "createdBy")) {
    out.createdBy = compactUser(value.createdBy);
  }
  if (Object.hasOwn(value, "updatedBy")) {
    out.updatedBy = compactUser(value.updatedBy);
  }
  if (Object.hasOwn(value, "deletedBy")) {
    out.deletedBy = compactUser(value.deletedBy);
  }

  return out;
}

export function compactSchedule(value: unknown) {
  if (!isRecord(value)) return value;
  const out: Record<string, unknown> = pick(value, [
    "id",
    "jwId",
    "date",
    "weekday",
    "startTime",
    "endTime",
    "weekIndex",
    "createdAt",
    "updatedAt",
    "customPlace",
  ]);
  if (Object.hasOwn(value, "section")) {
    out.section = compactSection(value.section);
  }
  if (Object.hasOwn(value, "room") && isRecord(value.room)) {
    const room = value.room;
    out.room = {
      ...pick(room, ["id", "jwId", "namePrimary", "nameSecondary"]),
      ...(Object.hasOwn(room, "building") && isRecord(room.building)
        ? {
            building: {
              ...pick(room.building, [
                "id",
                "jwId",
                "namePrimary",
                "nameSecondary",
              ]),
              ...(Object.hasOwn(room.building, "campus")
                ? { campus: compactCampus(room.building.campus) }
                : {}),
            },
          }
        : {}),
    };
  }
  if (Object.hasOwn(value, "teachers") && Array.isArray(value.teachers)) {
    out.teachers = asRecordArray(value.teachers).map(compactTeacher);
  }
  return out;
}

export function compactExam(value: unknown) {
  if (!isRecord(value)) return value;
  const out: Record<string, unknown> = pick(value, [
    "id",
    "jwId",
    "examDate",
    "startTime",
    "endTime",
    "createdAt",
    "updatedAt",
    "examType",
    "examMode",
    "examTakeCount",
  ]);
  if (Object.hasOwn(value, "section"))
    out.section = compactSection(value.section);
  if (Object.hasOwn(value, "examBatch") && isRecord(value.examBatch)) {
    out.examBatch = pick(value.examBatch, [
      "id",
      "jwId",
      "namePrimary",
      "nameSecondary",
    ]);
  }
  if (Object.hasOwn(value, "examRooms") && Array.isArray(value.examRooms)) {
    out.examRooms = asRecordArray(value.examRooms).map((room) =>
      pick(room, ["id", "jwId", "roomName", "buildingName", "room", "count"]),
    );
  }
  return out;
}

function compactBusRouteStop(value: unknown) {
  if (!isRecord(value)) return value;
  if (Object.hasOwn(value, "campus")) {
    return {
      stopOrder: value.stopOrder,
      campus: compactCampus(value.campus),
    };
  }
  return pick(value, ["stopOrder", "campusId", "campusName"]);
}

export function compactBusRoute(value: unknown) {
  if (!isRecord(value)) return value;
  const out: Record<string, unknown> = pick(value, [
    "id",
    "nameCn",
    "nameEn",
    "descriptionPrimary",
    "descriptionSecondary",
    "routeId",
    "weekdayTrips",
    "weekendTrips",
    "stopCount",
  ]);
  if (Object.hasOwn(value, "stops") && Array.isArray(value.stops)) {
    out.stops = asRecordArray(value.stops).map(compactBusRouteStop);
  }
  if (Object.hasOwn(value, "originCampus")) {
    out.originCampus = compactCampus(value.originCampus);
  }
  if (Object.hasOwn(value, "destinationCampus")) {
    out.destinationCampus = compactCampus(value.destinationCampus);
  }
  return out;
}

function compactBusStopTimes(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(compactMcpPayload);
  return value;
}

export function compactBusTrip(value: unknown) {
  if (!isRecord(value)) return value;
  const out: Record<string, unknown> = pick(value, [
    "id",
    "tripId",
    "routeId",
    "dayType",
    "position",
    "departureTime",
    "arrivalTime",
    "departureMinutes",
    "arrivalMinutes",
    "minutesUntilDeparture",
    "status",
    "departureEstimated",
    "arrivalEstimated",
  ]);
  if (Object.hasOwn(value, "stopTimes")) {
    out.stopTimes = compactBusStopTimes(value.stopTimes);
  }
  if (Object.hasOwn(value, "route")) {
    out.route = compactBusRoute(value.route);
  }
  if (Object.hasOwn(value, "originCampus")) {
    out.originCampus = compactCampus(value.originCampus);
  }
  if (Object.hasOwn(value, "destinationCampus")) {
    out.destinationCampus = compactCampus(value.destinationCampus);
  }
  return out;
}

function compactBusTripSlot(value: unknown) {
  if (!isRecord(value)) return value;
  return {
    position: value.position,
    stopTimes: compactBusStopTimes(value.stopTimes),
  };
}

export function compactCalendarSubscription(value: unknown) {
  if (!isRecord(value)) return value;
  const sections = asRecordArray(value.sections).map(compactSection);
  return {
    userId: value.userId,
    sectionCount: sections.length,
    sections,
    calendarPath:
      typeof value.calendarPath === "string"
        ? redactCalendarFeedLocation(value.calendarPath)
        : null,
    calendarUrl:
      typeof value.calendarUrl === "string"
        ? redactCalendarFeedLocation(value.calendarUrl)
        : null,
    note: value.note,
  };
}

// Explicit ordered dispatch registry.
// Order matters when shapes overlap (e.g. BusTrip before BusTripSlot).
const COMPACT_DISPATCH: {
  test: (v: Record<string, unknown>) => boolean;
  compact: (v: unknown) => unknown;
}[] = [
  {
    test: (v) =>
      Object.hasOwn(v, "sections") &&
      (Object.hasOwn(v, "calendarPath") || Object.hasOwn(v, "calendarUrl")),
    compact: compactCalendarSubscription,
  },
  {
    // BusTrip: has routeId + position + dayType (weekday|weekend) + stopTimes array
    test: (v) =>
      Object.hasOwn(v, "routeId") &&
      Object.hasOwn(v, "position") &&
      (v.dayType === "weekday" || v.dayType === "weekend") &&
      Object.hasOwn(v, "stopTimes") &&
      Array.isArray(v.stopTimes),
    compact: compactBusTrip,
  },
  {
    // BusTripSlot: has position + stopTimes but no routeId (distinguishes from BusTrip)
    test: (v) =>
      Object.hasOwn(v, "position") &&
      Array.isArray(v.stopTimes) &&
      !Object.hasOwn(v, "routeId"),
    compact: compactBusTripSlot,
  },
  {
    // BusRoute: has stops array where each stop has stopOrder + campus/campusId
    test: (v) => {
      if (!Object.hasOwn(v, "stops") || !Array.isArray(v.stops)) return false;
      if (!Object.hasOwn(v, "id")) return false;
      if (
        !Object.hasOwn(v, "nameCn") &&
        !Object.hasOwn(v, "descriptionPrimary")
      )
        return false;
      const stops = v.stops.filter(isRecord);
      if (stops.length === 0) return false;
      return stops.every(
        (stop) =>
          Object.hasOwn(stop, "stopOrder") &&
          (Object.hasOwn(stop, "campus") || Object.hasOwn(stop, "campusId")),
      );
    },
    compact: compactBusRoute,
  },
  {
    // BusCampus: has nameCn + coordinates but no stops
    test: (v) =>
      Object.hasOwn(v, "nameCn") &&
      Object.hasOwn(v, "latitude") &&
      Object.hasOwn(v, "longitude") &&
      !Object.hasOwn(v, "stops"),
    compact: (v) => compactCampus(v, { includeCoordinates: true }),
  },
  {
    test: (v) =>
      Object.hasOwn(v, "nameCn") &&
      (Object.hasOwn(v, "teacherId") ||
        Object.hasOwn(v, "personId") ||
        Object.hasOwn(v, "teacherTitleId") ||
        Object.hasOwn(v, "departmentId")),
    compact: compactTeacher,
  },
  {
    test: (v) =>
      Object.hasOwn(v, "code") &&
      (Object.hasOwn(v, "courseId") ||
        Object.hasOwn(v, "semesterId") ||
        Object.hasOwn(v, "campusId") ||
        Object.hasOwn(v, "openDepartmentId") ||
        (Object.hasOwn(v, "course") && Object.hasOwn(v, "semester"))),
    compact: compactSection,
  },
  {
    test: (v) =>
      Object.hasOwn(v, "code") &&
      (Object.hasOwn(v, "credit") ||
        Object.hasOwn(v, "hours") ||
        Object.hasOwn(v, "educationLevelId") ||
        Object.hasOwn(v, "sections")),
    compact: compactCourse,
  },
  {
    test: (v) =>
      Object.hasOwn(v, "jwId") &&
      Object.hasOwn(v, "code") &&
      Object.hasOwn(v, "nameCn") &&
      (Object.hasOwn(v, "startDate") || Object.hasOwn(v, "endDate")),
    compact: compactSemester,
  },
  {
    test: (v) =>
      Object.hasOwn(v, "title") &&
      Object.hasOwn(v, "submissionDueAt") &&
      (Object.hasOwn(v, "sectionId") ||
        Object.hasOwn(v, "requiresTeam") ||
        Object.hasOwn(v, "isMajor")),
    compact: compactHomework,
  },
  {
    test: (v) =>
      Object.hasOwn(v, "date") &&
      Object.hasOwn(v, "weekday") &&
      Object.hasOwn(v, "startTime") &&
      Object.hasOwn(v, "endTime") &&
      (Object.hasOwn(v, "sectionId") || Object.hasOwn(v, "weekIndex")),
    compact: compactSchedule,
  },
  {
    test: (v) =>
      Object.hasOwn(v, "sectionId") &&
      (Object.hasOwn(v, "examDate") ||
        Object.hasOwn(v, "examBatch") ||
        Object.hasOwn(v, "examRooms")),
    compact: compactExam,
  },
  {
    test: (v) => Object.hasOwn(v, "completed") && Object.hasOwn(v, "priority"),
    compact: compactTodo,
  },
];

// Per-key compactors for unknown wrapper objects (e.g. { section: ..., user: ... }).
// When none of the top-level dispatch entries match, each known key is compacted individually.
const KEY_COMPACTORS: Record<string, (v: unknown) => unknown> = {
  calendarPath: (v) =>
    typeof v === "string" ? redactCalendarFeedLocation(v) : v,
  calendarUrl: (v) =>
    typeof v === "string" ? redactCalendarFeedLocation(v) : v,
  user: compactUser,
  course: compactCourse,
  semester: compactSemester,
  campus: compactCampus,
  openDepartment: compactDepartment,
  department: compactDepartment,
  teacherTitle: compactTeacherTitle,
  teacher: compactTeacher,
  todo: compactTodo,
  homework: compactHomework,
  schedule: compactSchedule,
  exam: compactExam,
  section: compactSection,
};

// Per-key array compactors for known plural array fields.
const ARRAY_KEY_COMPACTORS: Record<string, (v: unknown) => unknown> = {
  todos: compactTodo,
  courses: compactCourse,
  sections: compactSection,
  teachers: compactTeacher,
  homeworks: compactHomework,
  schedules: compactSchedule,
  exams: compactExam,
  routes: compactBusRoute,
  trips: compactBusTrip,
};

export function compactMcpPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(compactMcpPayload);
  if (!isRecord(value)) return value;

  for (const { test, compact } of COMPACT_DISPATCH) {
    if (test(value)) return compact(value);
  }

  const out: Record<string, unknown> = {};
  for (const [key, fieldValue] of Object.entries(value)) {
    if (Object.hasOwn(KEY_COMPACTORS, key)) {
      out[key] = KEY_COMPACTORS[key](fieldValue);
      continue;
    }
    if (Object.hasOwn(ARRAY_KEY_COMPACTORS, key) && Array.isArray(fieldValue)) {
      out[key] = asRecordArray(fieldValue).map(ARRAY_KEY_COMPACTORS[key]);
      continue;
    }
    if (key === "campuses" && Array.isArray(fieldValue)) {
      out.campuses = asRecordArray(fieldValue).map((campus) =>
        compactCampus(campus, { includeCoordinates: true }),
      );
      continue;
    }
    if ((key === "weekday" || key === "weekend") && Array.isArray(fieldValue)) {
      out[key] = asRecordArray(fieldValue).map(compactBusTripSlot);
      continue;
    }
    if (key === "subscription") {
      out.subscription =
        isRecord(fieldValue) &&
        Object.hasOwn(fieldValue, "sections") &&
        (Object.hasOwn(fieldValue, "calendarPath") ||
          Object.hasOwn(fieldValue, "calendarUrl"))
          ? compactCalendarSubscription(fieldValue)
          : compactMcpPayload(fieldValue);
      continue;
    }
    if (key === "events" && Array.isArray(fieldValue)) {
      out.events = asRecordArray(fieldValue).map((event) => {
        const base = pick(event, ["type", "at"]);
        if (!Object.hasOwn(event, "payload")) return base;
        const type = event.type;
        if (type === "schedule") {
          return { ...base, payload: compactSchedule(event.payload) };
        }
        if (type === "homework_due") {
          return { ...base, payload: compactHomework(event.payload) };
        }
        if (type === "exam") {
          return { ...base, payload: compactExam(event.payload) };
        }
        if (type === "todo_due") {
          return { ...base, payload: compactTodo(event.payload) };
        }
        return { ...base, payload: compactMcpPayload(event.payload) };
      });
      continue;
    }
    out[key] = compactMcpPayload(fieldValue);
  }

  return out;
}

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

function compactUser(value: unknown) {
  if (!isRecord(value)) return value;
  return pick(value, ["id", "name", "username", "image"]);
}

function compactDepartment(value: unknown) {
  if (!isRecord(value)) return value;
  return pick(value, [
    "id",
    "nameCn",
    "nameEn",
    "namePrimary",
    "nameSecondary",
  ]);
}

function compactTeacherTitle(value: unknown) {
  if (!isRecord(value)) return value;
  return pick(value, [
    "id",
    "nameCn",
    "nameEn",
    "namePrimary",
    "nameSecondary",
  ]);
}

function compactCourse(value: unknown) {
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

function compactSemester(value: unknown) {
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

function compactCampus(
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

function compactTeacher(value: unknown) {
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

function compactSection(value: unknown) {
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

function compactTodo(value: unknown) {
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

function compactHomework(value: unknown) {
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

function compactSchedule(value: unknown) {
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

function compactExam(value: unknown) {
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

function compactBusRoute(value: unknown) {
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

function compactBusTrip(value: unknown) {
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
    out.stopTimes = compactMcpPayload(value.stopTimes);
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
    stopTimes: compactMcpPayload(value.stopTimes),
  };
}

function compactCalendarSubscription(value: unknown) {
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

function looksLikeTeacher(value: Record<string, unknown>) {
  return (
    Object.hasOwn(value, "nameCn") &&
    (Object.hasOwn(value, "teacherId") ||
      Object.hasOwn(value, "personId") ||
      Object.hasOwn(value, "teacherTitleId") ||
      Object.hasOwn(value, "departmentId"))
  );
}

function looksLikeSection(value: Record<string, unknown>) {
  return (
    Object.hasOwn(value, "code") &&
    (Object.hasOwn(value, "courseId") ||
      Object.hasOwn(value, "semesterId") ||
      Object.hasOwn(value, "campusId") ||
      Object.hasOwn(value, "openDepartmentId") ||
      (Object.hasOwn(value, "course") && Object.hasOwn(value, "semester")))
  );
}

function looksLikeCourse(value: Record<string, unknown>) {
  return (
    Object.hasOwn(value, "code") &&
    (Object.hasOwn(value, "credit") ||
      Object.hasOwn(value, "hours") ||
      Object.hasOwn(value, "educationLevelId") ||
      Object.hasOwn(value, "sections"))
  );
}

function looksLikeSemester(value: Record<string, unknown>) {
  return (
    Object.hasOwn(value, "jwId") &&
    Object.hasOwn(value, "code") &&
    Object.hasOwn(value, "nameCn") &&
    (Object.hasOwn(value, "startDate") || Object.hasOwn(value, "endDate"))
  );
}

function looksLikeBusCampus(value: Record<string, unknown>) {
  return (
    Object.hasOwn(value, "nameCn") &&
    Object.hasOwn(value, "latitude") &&
    Object.hasOwn(value, "longitude") &&
    !Object.hasOwn(value, "stops")
  );
}

function looksLikeBusRoute(value: Record<string, unknown>) {
  if (!Object.hasOwn(value, "stops") || !Array.isArray(value.stops))
    return false;
  if (!Object.hasOwn(value, "id")) return false;
  if (
    !Object.hasOwn(value, "nameCn") &&
    !Object.hasOwn(value, "descriptionPrimary")
  )
    return false;
  const stops = value.stops.filter(isRecord);
  if (stops.length === 0) return false;
  return stops.every(
    (stop) =>
      Object.hasOwn(stop, "stopOrder") &&
      (Object.hasOwn(stop, "campus") || Object.hasOwn(stop, "campusId")),
  );
}

function looksLikeBusTrip(value: Record<string, unknown>) {
  if (!Object.hasOwn(value, "routeId") || !Object.hasOwn(value, "position"))
    return false;
  const dayType = value.dayType;
  if (dayType !== "weekday" && dayType !== "weekend") return false;
  return Object.hasOwn(value, "stopTimes") && Array.isArray(value.stopTimes);
}

function looksLikeBusTripSlot(value: Record<string, unknown>) {
  return (
    Object.hasOwn(value, "position") &&
    Array.isArray(value.stopTimes) &&
    !Object.hasOwn(value, "routeId")
  );
}

function looksLikeCalendarSubscription(value: Record<string, unknown>) {
  return (
    Object.hasOwn(value, "sections") &&
    (Object.hasOwn(value, "calendarPath") ||
      Object.hasOwn(value, "calendarUrl"))
  );
}

export function compactMcpPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(compactMcpPayload);
  if (!isRecord(value)) return value;

  if (looksLikeCalendarSubscription(value))
    return compactCalendarSubscription(value);
  if (looksLikeBusTrip(value)) return compactBusTrip(value);
  if (looksLikeBusTripSlot(value)) return compactBusTripSlot(value);
  if (looksLikeBusRoute(value)) return compactBusRoute(value);
  if (looksLikeBusCampus(value)) {
    return compactCampus(value, { includeCoordinates: true });
  }
  if (looksLikeTeacher(value)) return compactTeacher(value);
  if (looksLikeSection(value)) return compactSection(value);
  if (looksLikeCourse(value)) return compactCourse(value);
  if (looksLikeSemester(value)) return compactSemester(value);
  if (Object.hasOwn(value, "completed") && Object.hasOwn(value, "priority")) {
    return compactTodo(value);
  }

  const out: Record<string, unknown> = {};
  for (const [key, fieldValue] of Object.entries(value)) {
    if (key === "calendarPath" || key === "calendarUrl") {
      out[key] =
        typeof fieldValue === "string"
          ? redactCalendarFeedLocation(fieldValue)
          : fieldValue;
      continue;
    }
    if (key === "user") {
      out.user = compactUser(fieldValue);
      continue;
    }
    if (key === "course") {
      out.course = compactCourse(fieldValue);
      continue;
    }
    if (key === "semester") {
      out.semester = compactSemester(fieldValue);
      continue;
    }
    if (key === "campus") {
      out.campus = compactCampus(fieldValue);
      continue;
    }
    if (key === "openDepartment" || key === "department") {
      out[key] = compactDepartment(fieldValue);
      continue;
    }
    if (key === "teacherTitle") {
      out.teacherTitle = compactTeacherTitle(fieldValue);
      continue;
    }
    if (key === "teacher") {
      out.teacher = compactTeacher(fieldValue);
      continue;
    }
    if (key === "todo") {
      out.todo = compactTodo(fieldValue);
      continue;
    }
    if (key === "homework") {
      out.homework = compactHomework(fieldValue);
      continue;
    }
    if (key === "schedule") {
      out.schedule = compactSchedule(fieldValue);
      continue;
    }
    if (key === "exam") {
      out.exam = compactExam(fieldValue);
      continue;
    }
    if (key === "section") {
      out.section = compactSection(fieldValue);
      continue;
    }
    if (key === "subscription") {
      out.subscription =
        isRecord(fieldValue) && looksLikeCalendarSubscription(fieldValue)
          ? compactCalendarSubscription(fieldValue)
          : compactMcpPayload(fieldValue);
      continue;
    }
    if (key === "todos" && Array.isArray(fieldValue)) {
      out.todos = asRecordArray(fieldValue).map(compactTodo);
      continue;
    }
    if (key === "courses" && Array.isArray(fieldValue)) {
      out.courses = asRecordArray(fieldValue).map(compactCourse);
      continue;
    }
    if (key === "sections" && Array.isArray(fieldValue)) {
      out.sections = asRecordArray(fieldValue).map(compactSection);
      continue;
    }
    if (key === "teachers" && Array.isArray(fieldValue)) {
      out.teachers = asRecordArray(fieldValue).map(compactTeacher);
      continue;
    }
    if (key === "campuses" && Array.isArray(fieldValue)) {
      out.campuses = asRecordArray(fieldValue).map((campus) =>
        compactCampus(campus, { includeCoordinates: true }),
      );
      continue;
    }
    if (key === "routes" && Array.isArray(fieldValue)) {
      out.routes = asRecordArray(fieldValue).map(compactBusRoute);
      continue;
    }
    if (key === "trips" && Array.isArray(fieldValue)) {
      out.trips = asRecordArray(fieldValue).map(compactBusTrip);
      continue;
    }
    if ((key === "weekday" || key === "weekend") && Array.isArray(fieldValue)) {
      out[key] = asRecordArray(fieldValue).map(compactBusTripSlot);
      continue;
    }
    if (key === "homeworks" && Array.isArray(fieldValue)) {
      out.homeworks = asRecordArray(fieldValue).map(compactHomework);
      continue;
    }
    if (key === "schedules" && Array.isArray(fieldValue)) {
      out.schedules = asRecordArray(fieldValue).map(compactSchedule);
      continue;
    }
    if (key === "exams" && Array.isArray(fieldValue)) {
      out.exams = asRecordArray(fieldValue).map(compactExam);
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value as Record<string, unknown>[];
}

function compactUser(value: unknown) {
  if (!isRecord(value)) return value;
  return pick(value, ["id", "name", "username", "image"]);
}

function pick<T extends Record<string, unknown>, K extends keyof T>(
  value: T,
  keys: K[],
): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const key of keys) {
    if (Object.hasOwn(value, key)) out[key] = value[key];
  }
  return out;
}

function compactCourse(value: unknown) {
  if (!isRecord(value)) return value;
  return pick(value, [
    "id",
    "jwId",
    "code",
    "namePrimary",
    "nameSecondary",
    "credit",
    "hours",
  ]);
}

function compactSemester(value: unknown) {
  if (!isRecord(value)) return value;
  return pick(value, ["id", "jwId", "code", "nameCn", "namePrimary"]);
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
  return out;
}

function compactTodo(value: unknown) {
  if (!isRecord(value)) return value;
  return pick(value, [
    "id",
    "title",
    "content",
    "priority",
    "dueAt",
    "completed",
    "createdAt",
    "updatedAt",
  ]);
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
  if (Object.hasOwn(value, "section"))
    out.section = compactSection(value.section);
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
  ]);
  if (Object.hasOwn(value, "section"))
    out.section = compactSection(value.section);
  if (Object.hasOwn(value, "room") && isRecord(value.room)) {
    const room = value.room;
    out.room = {
      ...pick(room, ["id", "jwId", "namePrimary", "nameSecondary"]),
      ...(Object.hasOwn(room, "building") && isRecord(room.building)
        ? {
            building: pick(room.building, [
              "id",
              "jwId",
              "namePrimary",
              "nameSecondary",
            ]),
          }
        : {}),
    };
  }
  if (Object.hasOwn(value, "teachers") && Array.isArray(value.teachers)) {
    out.teachers = asRecordArray(value.teachers).map((teacher) =>
      pick(teacher, ["id", "jwId", "namePrimary", "nameSecondary"]),
    );
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
      pick(room, ["id", "jwId", "roomName", "buildingName"]),
    );
  }
  return out;
}

export function compactMcpPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(compactMcpPayload);
  if (!isRecord(value)) return value;

  if (Object.hasOwn(value, "todos") && Array.isArray(value.todos)) {
    return { ...value, todos: (value.todos as unknown[]).map(compactTodo) };
  }
  if (Object.hasOwn(value, "courses") && Array.isArray(value.courses)) {
    return {
      ...value,
      courses: (value.courses as unknown[]).map(compactCourse),
    };
  }
  if (Object.hasOwn(value, "sections") && Array.isArray(value.sections)) {
    return {
      ...value,
      sections: (value.sections as unknown[]).map(compactSection),
    };
  }
  if (Object.hasOwn(value, "section")) {
    return { ...value, section: compactSection(value.section) };
  }
  if (Object.hasOwn(value, "homeworks") && Array.isArray(value.homeworks)) {
    return {
      ...value,
      homeworks: (value.homeworks as unknown[]).map(compactHomework),
    };
  }
  if (Object.hasOwn(value, "schedules") && Array.isArray(value.schedules)) {
    return {
      ...value,
      schedules: (value.schedules as unknown[]).map(compactSchedule),
    };
  }
  if (Object.hasOwn(value, "exams") && Array.isArray(value.exams)) {
    return { ...value, exams: (value.exams as unknown[]).map(compactExam) };
  }
  if (Object.hasOwn(value, "events") && Array.isArray(value.events)) {
    const events = (value.events as unknown[]).map((event) => {
      if (!isRecord(event)) return event;
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
    return { ...value, events };
  }

  const out: Record<string, unknown> = { ...value };
  if (Object.hasOwn(out, "course")) out.course = compactCourse(out.course);
  if (Object.hasOwn(out, "todo")) out.todo = compactTodo(out.todo);
  if (Object.hasOwn(out, "homework"))
    out.homework = compactHomework(out.homework);
  if (Object.hasOwn(out, "schedule"))
    out.schedule = compactSchedule(out.schedule);
  if (Object.hasOwn(out, "exam")) out.exam = compactExam(out.exam);
  return out;
}

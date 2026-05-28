import { isRecord } from "@/lib/utils";
import {
  compactBusRoute,
  compactBusTrip,
  compactBusTripSlot,
} from "./compact-bus";
import { compactCalendarSubscription } from "./compact-calendar";
import {
  compactCampus,
  compactCourse,
  compactDepartment,
  compactExam,
  compactHomework,
  compactSchedule,
  compactSection,
  compactSemester,
  compactTeacher,
  compactTeacherTitle,
  compactTodo,
  compactUser,
} from "./compact-entities";
import {
  asRecordArray,
  pick,
  redactCalendarFeedLocation,
} from "./compact-helpers";

export {
  compactBusRoute,
  compactBusTrip,
  compactBusTripSlot,
} from "./compact-bus";
export { compactCalendarSubscription } from "./compact-calendar";
export {
  compactCampus,
  compactCourse,
  compactDepartment,
  compactExam,
  compactHomework,
  compactSchedule,
  compactSection,
  compactSemester,
  compactTeacher,
  compactTeacherTitle,
  compactTodo,
  compactUser,
} from "./compact-entities";
// Re-export everything that external consumers need.
// Keep this file as the canonical import surface for backward compatibility.
export {
  asRecordArray,
  pick,
  redactCalendarFeedLocation,
} from "./compact-helpers";

/* ------------------------------------------------------------------ */
/*  Array item dispatch — unique discriminator fields                  */
/*                                                                     */
/*  Each entity type has at least one field that NO other type has.    */
/*  Using unique discriminators eliminates ordering dependency and     */
/*  makes the dispatch deterministic (no silent misidentification).   */
/* ------------------------------------------------------------------ */

function compactArrayItem(value: unknown): unknown {
  if (!isRecord(value)) return compactMcpPayload(value);

  if (
    Object.hasOwn(value, "sections") &&
    (Object.hasOwn(value, "calendarPath") ||
      Object.hasOwn(value, "calendarUrl"))
  ) {
    return compactCalendarSubscription(value);
  }

  if (
    Object.hasOwn(value, "routeId") &&
    (value.dayType === "weekday" || value.dayType === "weekend") &&
    Object.hasOwn(value, "stopTimes") &&
    Array.isArray(value.stopTimes)
  ) {
    return compactBusTrip(value);
  }

  if (
    Object.hasOwn(value, "position") &&
    Array.isArray(value.stopTimes) &&
    !Object.hasOwn(value, "routeId") &&
    !Object.hasOwn(value, "dayType")
  ) {
    return compactBusTripSlot(value);
  }

  if (
    Object.hasOwn(value, "stops") &&
    Array.isArray(value.stops) &&
    Object.hasOwn(value, "routeId") &&
    typeof value.routeId === "string" &&
    !Object.hasOwn(value, "dayType")
  ) {
    return compactBusRoute(value);
  }

  if (
    Object.hasOwn(value, "latitude") &&
    Object.hasOwn(value, "longitude") &&
    !Object.hasOwn(value, "stops")
  ) {
    return compactCampus(value, { includeCoordinates: true });
  }

  if (
    Object.hasOwn(value, "teacherId") ||
    Object.hasOwn(value, "personId") ||
    Object.hasOwn(value, "teacherTitleId") ||
    Object.hasOwn(value, "departmentId")
  ) {
    return compactTeacher(value);
  }

  if (Object.hasOwn(value, "completed") && Object.hasOwn(value, "priority")) {
    return compactTodo(value);
  }

  if (
    Object.hasOwn(value, "submissionDueAt") &&
    (Object.hasOwn(value, "sectionId") ||
      Object.hasOwn(value, "isMajor") ||
      Object.hasOwn(value, "requiresTeam"))
  ) {
    return compactHomework(value);
  }

  if (
    (Object.hasOwn(value, "examDate") ||
      Object.hasOwn(value, "examBatch") ||
      Object.hasOwn(value, "examRooms")) &&
    Object.hasOwn(value, "sectionId")
  ) {
    return compactExam(value);
  }

  if (
    Object.hasOwn(value, "date") &&
    Object.hasOwn(value, "weekday") &&
    Object.hasOwn(value, "startTime") &&
    Object.hasOwn(value, "endTime")
  ) {
    return compactSchedule(value);
  }

  if (
    Object.hasOwn(value, "campusId") ||
    Object.hasOwn(value, "openDepartmentId") ||
    (Object.hasOwn(value, "course") && Object.hasOwn(value, "semester"))
  ) {
    return compactSection(value);
  }

  if (
    Object.hasOwn(value, "credit") ||
    Object.hasOwn(value, "hours") ||
    Object.hasOwn(value, "educationLevelId")
  ) {
    return compactCourse(value);
  }

  if (
    Object.hasOwn(value, "nameCn") &&
    Object.hasOwn(value, "code") &&
    (Object.hasOwn(value, "startDate") || Object.hasOwn(value, "endDate")) &&
    !Object.hasOwn(value, "campusId")
  ) {
    return compactSemester(value);
  }

  return compactMcpPayload(value);
}

/* ------------------------------------------------------------------ */
/*  Recursive compactor (top-level)                                     */
/* ------------------------------------------------------------------ */

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
  subscriptions: compactCalendarSubscription,
};

const EVENT_PAYLOAD_COMPACTORS: Record<string, (v: unknown) => unknown> = {
  schedule: compactSchedule,
  homework_due: compactHomework,
  exam: compactExam,
  todo_due: compactTodo,
};

export function compactMcpPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(compactArrayItem);
  if (!isRecord(value)) return value;

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
      out.campuses = asRecordArray(fieldValue).map((c) =>
        compactCampus(c, { includeCoordinates: true }),
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
        const compactFn =
          typeof event.type === "string"
            ? EVENT_PAYLOAD_COMPACTORS[event.type]
            : undefined;
        return {
          ...base,
          payload: (compactFn ?? compactMcpPayload)(event.payload),
        };
      });
      continue;
    }
    out[key] = compactMcpPayload(fieldValue);
  }

  return out;
}

import type { getNextBusDepartures } from "@/features/bus/lib/bus-service";
import type { listUserCalendarEvents } from "@/features/home/server/calendar-events";

type CalendarEvent = Awaited<ReturnType<typeof listUserCalendarEvents>>[number];
type BusDeparture = NonNullable<
  Awaited<ReturnType<typeof getNextBusDepartures>>
>["departures"][number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pick<
  T extends Record<string, unknown>,
  const K extends readonly (keyof T)[],
>(value: T, keys: K): Pick<T, K[number]> {
  const out = {} as Pick<T, K[number]>;
  for (const key of keys) {
    if (Object.hasOwn(value, key) && value[key] !== undefined) {
      out[key] = value[key];
    }
  }
  return out;
}

export function summarizeSectionCard(value: unknown) {
  if (!isRecord(value)) return value;
  const out: Record<string, unknown> = pick(value, ["id", "jwId", "code"]);
  if (isRecord(value.course)) {
    out.course = pick(value.course, [
      "jwId",
      "code",
      "nameCn",
      "nameEn",
      "namePrimary",
      "nameSecondary",
    ]);
  }
  if (isRecord(value.semester)) {
    out.semester = pick(value.semester, ["id", "jwId", "code", "nameCn"]);
  }
  if (isRecord(value.campus)) {
    out.campus = pick(value.campus, [
      "id",
      "nameCn",
      "nameEn",
      "namePrimary",
      "nameSecondary",
    ]);
  }
  return out;
}

export function summarizeTeacherCard(value: unknown) {
  if (!isRecord(value)) return value;
  return pick(value, ["id", "code", "nameCn", "nameEn", "namePrimary"]);
}

export function summarizeRoomCard(value: unknown) {
  if (!isRecord(value)) return value;
  const out: Record<string, unknown> = pick(value, [
    "id",
    "jwId",
    "namePrimary",
    "nameSecondary",
  ]);
  if (isRecord(value.building)) {
    out.building = pick(value.building, [
      "id",
      "jwId",
      "namePrimary",
      "nameSecondary",
    ]);
  }
  return out;
}

export function summarizeTodoCard(value: unknown) {
  if (!isRecord(value)) return value;
  return pick(value, [
    "id",
    "title",
    "priority",
    "dueAt",
    "completed",
    "createdAt",
    "updatedAt",
  ]);
}

export function summarizeHomeworkCard(value: unknown) {
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
    "completion",
    "commentCount",
  ]);
  if (Object.hasOwn(value, "section")) {
    out.section = summarizeSectionCard(value.section);
  }
  return out;
}

export function summarizeScheduleCard(value: unknown) {
  if (!isRecord(value)) return value;
  const out: Record<string, unknown> = pick(value, [
    "id",
    "date",
    "weekday",
    "startTime",
    "endTime",
    "weekIndex",
    "customPlace",
  ]);
  if (Object.hasOwn(value, "section")) {
    out.section = summarizeSectionCard(value.section);
  }
  if (Object.hasOwn(value, "room")) {
    out.room = summarizeRoomCard(value.room);
  }
  if (Array.isArray(value.teachers)) {
    out.teachers = value.teachers.map(summarizeTeacherCard);
  }
  return out;
}

export function summarizeExamCard(value: unknown) {
  if (!isRecord(value)) return value;
  const out: Record<string, unknown> = pick(value, [
    "id",
    "jwId",
    "examDate",
    "startTime",
    "endTime",
    "examType",
    "examMode",
    "examTakeCount",
  ]);
  if (Object.hasOwn(value, "section")) {
    out.section = summarizeSectionCard(value.section);
  }
  if (Array.isArray(value.examRooms)) {
    out.examRooms = value.examRooms.map((room) =>
      isRecord(room)
        ? pick(room, ["id", "jwId", "roomName", "buildingName", "count"])
        : room,
    );
  }
  return out;
}

export function summarizeBusDeparture(value: unknown) {
  if (!isRecord(value)) return value;
  const out: Record<string, unknown> = pick(value, [
    "tripId",
    "routeId",
    "departureTime",
    "arrivalTime",
    "minutesUntilDeparture",
    "dayType",
    "status",
    "departureEstimated",
    "arrivalEstimated",
  ]);
  if (isRecord(value.route)) {
    out.route = pick(value.route, [
      "id",
      "nameCn",
      "nameEn",
      "descriptionPrimary",
      "descriptionSecondary",
    ]);
  }
  return out;
}

export function summarizeCalendarEvent(value: CalendarEvent) {
  const base = {
    type: value.type,
    at: value.at,
  };
  if (value.type === "schedule") {
    return { ...base, payload: summarizeScheduleCard(value.payload) };
  }
  if (value.type === "homework_due") {
    return { ...base, payload: summarizeHomeworkCard(value.payload) };
  }
  if (value.type === "exam") {
    return { ...base, payload: summarizeExamCard(value.payload) };
  }
  return { ...base, payload: summarizeTodoCard(value.payload) };
}

function createEventTypeCounts() {
  return {
    schedule: 0,
    homework_due: 0,
    exam: 0,
    todo_due: 0,
  };
}

export function summarizeCalendarEventCollection(
  events: readonly CalendarEvent[],
  options?: {
    itemLimit?: number;
    dayLimit?: number;
  },
) {
  const itemLimit = options?.itemLimit ?? 5;
  const dayLimit = options?.dayLimit ?? 7;
  const byType = createEventTypeCounts();

  const dayMap = new Map<
    string,
    {
      date: string;
      total: number;
      byType: ReturnType<typeof createEventTypeCounts>;
    }
  >();

  for (const event of events) {
    byType[event.type] += 1;
    const dayKey =
      typeof event.at === "string" && event.at.length >= 10
        ? event.at.slice(0, 10)
        : "unknown";
    const existing = dayMap.get(dayKey);
    if (existing) {
      existing.total += 1;
      existing.byType[event.type] += 1;
      continue;
    }
    dayMap.set(dayKey, {
      date: dayKey,
      total: 1,
      byType: {
        ...createEventTypeCounts(),
        [event.type]: 1,
      },
    });
  }

  return {
    total: events.length,
    byType,
    items: events.slice(0, itemLimit).map(summarizeCalendarEvent),
    days: Array.from(dayMap.values()).slice(0, dayLimit),
  };
}

export function summarizeBusDepartureList(
  departures: readonly BusDeparture[],
  limit: number,
) {
  return departures.slice(0, limit).map(summarizeBusDeparture);
}

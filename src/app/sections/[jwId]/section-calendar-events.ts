import dayjs from "dayjs";
import type { CalendarEvent } from "@/components/event-calendar";
import { formatTime } from "@/shared/lib/time-utils";

type ScheduleWithRoom = {
  id: number;
  date: Date | null;
  startTime: number | null;
  endTime: number | null;
  startUnit: number | null;
  endUnit: number | null;
  weekIndex: number | null;
  customPlace: string | null;
  room: {
    namePrimary: string;
    building: {
      namePrimary: string;
      campus: { namePrimary: string } | null;
    } | null;
  } | null;
  teachers: { namePrimary: string }[];
};

type ExamWithBatch = {
  id: number;
  examDate: Date | null;
  startTime: number | null;
  endTime: number | null;
  examMode: string | null;
  examTakeCount: number | null;
  examBatch: { namePrimary: string } | null;
  examRooms: { room: string | null }[];
};

type Labels = {
  classEvent: string;
  examEvent: string;
  location: string;
  teacher: string;
  units: string;
  week: string;
  examMode: string;
  examBatch: string;
  examCount: string;
};

function formatDetailValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function formatScheduleLocation(schedule: ScheduleWithRoom) {
  if (schedule.customPlace) return schedule.customPlace;
  if (!schedule.room) return "—";

  const parts = [schedule.room.namePrimary];
  if (schedule.room.building) {
    parts.push(schedule.room.building.namePrimary);
    if (schedule.room.building.campus) {
      parts.push(schedule.room.building.campus.namePrimary);
    }
  }

  return parts.join(" · ");
}

function toMinutes(time: number | null | undefined) {
  return time === null || time === undefined
    ? undefined
    : Math.floor(time / 100) * 60 + (time % 100);
}

export function buildSectionCalendarEvents(
  schedules: ScheduleWithRoom[],
  exams: ExamWithBatch[],
  sectionJwId: number,
  courseName: string | undefined,
  labels: Labels,
): CalendarEvent[] {
  const scheduleEvents: CalendarEvent[] = schedules.map((schedule) => {
    const timeRange = `${formatTime(schedule.startTime)}-${formatTime(
      schedule.endTime,
    )}`;
    const location = formatScheduleLocation(schedule);
    const metaStr = [timeRange, location].filter(Boolean).join(" · ");
    const meta = metaStr
      ? metaStr.length > 60
        ? `${metaStr.slice(0, 60)}…`
        : metaStr
      : undefined;
    const details = [
      { label: labels.location, value: location },
      {
        label: labels.teacher,
        value:
          schedule.teachers && schedule.teachers.length > 0
            ? schedule.teachers.map((t) => t.namePrimary).join(", ")
            : "—",
      },
      {
        label: labels.units,
        value: `${schedule.startUnit} - ${schedule.endUnit}`,
      },
      { label: labels.week, value: schedule.weekIndex ?? "—" },
    ].flatMap((detail) => {
      const value = formatDetailValue(detail.value);
      return value ? [{ ...detail, value }] : [];
    });

    return {
      id: `schedule-${schedule.id}`,
      date: schedule.date,
      title: labels.classEvent,
      meta,
      href: `/sections/${sectionJwId}`,
      variant: "session",
      sortValue: toMinutes(schedule.startTime),
      details,
    };
  });

  const examEvents: CalendarEvent[] = exams.map((exam) => {
    const timeRange =
      exam.startTime !== null && exam.endTime !== null
        ? `${formatTime(exam.startTime)}-${formatTime(exam.endTime)}`
        : "";
    const examRooms = exam.examRooms
      ? exam.examRooms
          .map((room) => room.room)
          .filter(Boolean)
          .join(", ")
      : "";
    const details = [
      { label: labels.examMode, value: exam.examMode ?? "" },
      { label: labels.examBatch, value: exam.examBatch?.namePrimary ?? "" },
      { label: labels.location, value: examRooms },
      { label: labels.examCount, value: exam.examTakeCount ?? null },
    ].flatMap((detail) => {
      const value = formatDetailValue(detail.value);
      return value ? [{ ...detail, value }] : [];
    });

    return {
      id: `exam-${exam.id}`,
      date: exam.examDate,
      title: courseName ?? labels.examEvent,
      meta: timeRange || undefined,
      href: `/sections/${sectionJwId}`,
      variant: "exam",
      sortValue: toMinutes(exam.startTime),
      details,
    };
  });

  return [...scheduleEvents, ...examEvents];
}

export function computeCalendarDates(
  calendarEvents: CalendarEvent[],
  schedules: { date: Date | null }[],
) {
  const datedEvents = calendarEvents
    .filter((event): event is CalendarEvent & { date: Date } =>
      Boolean(event.date),
    )
    .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());
  const firstScheduleDate = schedules[0]?.date ?? null;
  const lastEventDate = datedEvents.at(-1)?.date ?? null;
  const today = dayjs().startOf("day");
  const isOngoing =
    firstScheduleDate &&
    lastEventDate &&
    !today.isBefore(dayjs(firstScheduleDate).startOf("day")) &&
    !today.isAfter(dayjs(lastEventDate).startOf("day"));
  const fallbackStartDate =
    firstScheduleDate ?? datedEvents[0]?.date ?? today.toDate();
  const calendarMonthStart = dayjs(isOngoing ? today : fallbackStartDate)
    .startOf("month")
    .toDate();

  const scheduleDateKeys = new Set(
    schedules
      .filter((schedule) => schedule.date)
      .map((schedule) => dayjs(schedule.date).format("YYYY-MM-DD")),
  );

  return { calendarMonthStart, scheduleDateKeys, today };
}

export function computeMiniCalendarData(
  calendarMonthStart: Date,
  exams: { examDate: Date | null }[],
) {
  const miniMonthStart = dayjs(calendarMonthStart).startOf("month");
  const miniWeekStartsOn = 0;
  let miniGridStart = miniMonthStart;
  while (miniGridStart.day() !== miniWeekStartsOn) {
    miniGridStart = miniGridStart.subtract(1, "day");
  }
  const miniDays = Array.from({ length: 42 }, (_, index) =>
    miniGridStart.add(index, "day"),
  );
  const miniWeekdays = Array.from(
    { length: 7 },
    (_, index) => (miniWeekStartsOn + index) % 7,
  );
  const examDateKeys = new Set(
    exams
      .filter((exam) => exam.examDate)
      .map((exam) => dayjs(exam.examDate).format("YYYY-MM-DD")),
  );

  return {
    miniMonthStart,
    miniDays,
    miniWeekdays,
    miniMonthLabel: miniMonthStart.format("YYYY.MM"),
    examDateKeys,
  };
}

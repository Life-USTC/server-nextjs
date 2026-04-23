import type dayjs from "dayjs";
import { formatScheduleLocation } from "@/lib/location-utils";
import { shanghaiDayjs } from "@/lib/time/shanghai-dayjs";
import { getWeekStartSunday } from "@/shared/lib/date-utils";
import { toMinutes } from "@/shared/lib/time-utils";
import type {
  ExamItem,
  HomeworkWithSection,
  SectionWithRelations,
  SemesterSummary,
  SessionItem,
  TimeSlot,
} from "./dashboard-types";

export const resolveDashboardSections = (
  allSections: SectionWithRelations[],
  currentSemester: SemesterSummary | null,
) => {
  const currentTermSections = currentSemester
    ? allSections.filter(
        (section) => section.semester?.id === currentSemester.id,
      )
    : [];

  const hasAnySelection = allSections.length > 0;
  const hasCurrentTermSelection = currentTermSections.length > 0;
  const dashboardSections = hasCurrentTermSelection ? currentTermSections : [];
  const dashboardSectionIds = Array.from(
    new Set(dashboardSections.map((section) => section.id)),
  );

  return {
    currentTermSections,
    hasAnySelection,
    hasCurrentTermSelection,
    dashboardSections,
    dashboardSectionIds,
  };
};

export const buildSessions = (
  sections: SectionWithRelations[],
): SessionItem[] =>
  sections.flatMap((section) =>
    section.schedules.flatMap((schedule) => {
      if (!schedule.date) return [];
      const teacherDisplay =
        schedule.teachers && schedule.teachers.length > 0
          ? schedule.teachers.map((t) => t.namePrimary).join(", ")
          : "—";
      return [
        {
          id: `s-${section.id}-${schedule.id}`,
          sectionJwId: section.jwId,
          courseName: section.course.namePrimary ?? "",
          date: schedule.date,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          location: formatScheduleLocation(schedule),
          teacherDisplay,
        },
      ];
    }),
  );

export const sortSessionsByStart = (sessions: SessionItem[]) =>
  [...sessions].sort((a, b) => {
    const d = shanghaiDayjs(a.date).valueOf() - shanghaiDayjs(b.date).valueOf();
    if (d !== 0) return d;
    return toMinutes(a.startTime) - toMinutes(b.startTime);
  });

export const buildExams = (sections: SectionWithRelations[]): ExamItem[] =>
  sections.flatMap((section) =>
    section.exams.map((exam) => ({
      id: `e-${section.id}-${exam.id}`,
      courseName: section.course.namePrimary ?? "",
      date: exam.examDate,
      startTime: exam.startTime,
      endTime: exam.endTime,
      examType: exam.examType ?? null,
      examMode: exam.examMode ?? null,
      examTakeCount: exam.examTakeCount ?? null,
      rooms:
        exam.examRooms?.map((r) => ({ room: r.room, count: r.count })) ?? [],
    })),
  );

export const filterSessionsByDay = (
  sessions: SessionItem[],
  targetDay: dayjs.Dayjs,
) =>
  sessions.filter((item) => shanghaiDayjs(item.date).isSame(targetDay, "day"));

/** Returns weeks (Mon–Sun) from semester start to end, inclusive. */
export const getSemesterWeeks = (
  semesterStart: dayjs.Dayjs,
  semesterEnd: dayjs.Dayjs,
): dayjs.Dayjs[][] => {
  const weeks: dayjs.Dayjs[][] = [];
  let weekStart = getWeekStartSunday(semesterStart.startOf("day"));
  const lastWeekStart = getWeekStartSunday(semesterEnd.startOf("day"));

  while (
    weekStart.isBefore(lastWeekStart, "day") ||
    weekStart.isSame(lastWeekStart, "day")
  ) {
    weeks.push(
      Array.from({ length: 7 }, (_, i) =>
        weekStart.add(i, "day").startOf("day"),
      ),
    );
    weekStart = weekStart.add(7, "day");
  }

  return weeks;
};

export const selectWeeklySessions = (
  sessions: SessionItem[],
  weekStart: dayjs.Dayjs,
  weekEnd: dayjs.Dayjs,
) =>
  sessions.filter((item) => {
    const date = shanghaiDayjs(item.date);
    return !date.isBefore(weekStart) && date.isBefore(weekEnd);
  });

export const buildWeekDays = (weekStart: dayjs.Dayjs) =>
  Array.from({ length: 7 }, (_, index) => weekStart.add(index, "day"));

export const buildTimeSlots = (weeklySessions: SessionItem[]): TimeSlot[] =>
  Array.from(
    new Set(weeklySessions.map((item) => `${item.startTime}-${item.endTime}`)),
  )
    .map((value) => {
      const [startTime, endTime] = value
        .split("-")
        .map((item) => parseInt(item, 10));
      return { key: value, startTime, endTime };
    })
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

export const computeHomeworkBuckets = (
  homeworks: HomeworkWithSection[],
  todayStart: dayjs.Dayjs,
) => {
  const incompleteHomeworks = homeworks.filter(
    (homework) => homework.homeworkCompletions.length === 0,
  );
  const dueToday = incompleteHomeworks.filter((homework) => {
    if (!homework.submissionDueAt) return false;
    return shanghaiDayjs(homework.submissionDueAt).isSame(todayStart, "day");
  });
  const dueWithin3Days = incompleteHomeworks.filter((homework) => {
    if (!homework.submissionDueAt) return false;
    const due = shanghaiDayjs(homework.submissionDueAt);
    return due.isAfter(todayStart) && due.isBefore(todayStart.add(4, "day"));
  });

  return { incompleteHomeworks, dueToday, dueWithin3Days };
};

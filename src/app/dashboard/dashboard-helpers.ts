import dayjs from "dayjs";
import { toMinutes } from "@/lib/time-utils";
import type {
  ExamItem,
  HomeworkWithSection,
  ScheduleTimeItem,
  SectionWithRelations,
  SemesterSummary,
  SessionItem,
  SubscriptionSchedule,
  SubscriptionWithSections,
  TimeSlot,
} from "./types";

export const extractSections = (subscriptions: SubscriptionWithSections[]) => {
  const allSections = subscriptions.flatMap(
    (subscription) => subscription.sections,
  );
  const allSectionIds = Array.from(
    new Set(allSections.map((section) => section.id)),
  );
  return { allSections, allSectionIds };
};

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

export const buildScheduleTimes = (
  sections: SectionWithRelations[],
): ScheduleTimeItem[] =>
  sections.flatMap((section) =>
    section.schedules.flatMap((schedule) =>
      schedule.date
        ? [
            {
              date: schedule.date,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
            },
          ]
        : [],
    ),
  );

export const formatScheduleLocation = (schedule: SubscriptionSchedule) => {
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
};

export const buildSessions = (
  sections: SectionWithRelations[],
): SessionItem[] =>
  sections.flatMap((section) =>
    section.schedules.flatMap((schedule) => {
      if (!schedule.date) return [];
      return [
        {
          id: `s-${section.id}-${schedule.id}`,
          sectionJwId: section.jwId,
          courseName: section.course.namePrimary ?? "",
          date: schedule.date,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          location: formatScheduleLocation(schedule),
        },
      ];
    }),
  );

export const sortSessionsByStart = (sessions: SessionItem[]) =>
  [...sessions].sort((a, b) => {
    const d = dayjs(a.date).valueOf() - dayjs(b.date).valueOf();
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
    })),
  );

export const filterSessionsByDay = (
  sessions: SessionItem[],
  targetDay: dayjs.Dayjs,
) => sessions.filter((item) => dayjs(item.date).isSame(targetDay, "day"));

export const findCurrentSession = (sessions: SessionItem[], now: dayjs.Dayjs) =>
  sessions.find((item) => {
    const start = dayjs(item.date)
      .hour(Math.floor(item.startTime / 100))
      .minute(item.startTime % 100);
    const end = dayjs(item.date)
      .hour(Math.floor(item.endTime / 100))
      .minute(item.endTime % 100);
    return now.isAfter(start) && now.isBefore(end);
  });

export const findNextSession = (sessions: SessionItem[], now: dayjs.Dayjs) =>
  sessions.find((item) => {
    const start = dayjs(item.date)
      .hour(Math.floor(item.startTime / 100))
      .minute(item.startTime % 100);
    return start.isAfter(now);
  });

export const filterRemainingSessions = (
  todaySessions: SessionItem[],
  now: dayjs.Dayjs,
) =>
  todaySessions.filter((item) => {
    const start = dayjs(item.date)
      .hour(Math.floor(item.startTime / 100))
      .minute(item.startTime % 100);
    return start.isAfter(now);
  });

export const selectWeeklySessions = (
  sessions: SessionItem[],
  weekStart: dayjs.Dayjs,
  weekEnd: dayjs.Dayjs,
) =>
  sessions.filter((item) => {
    const date = dayjs(item.date);
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
    return dayjs(homework.submissionDueAt).isSame(todayStart, "day");
  });
  const dueWithin3Days = incompleteHomeworks.filter((homework) => {
    if (!homework.submissionDueAt) return false;
    const due = dayjs(homework.submissionDueAt);
    return due.isAfter(todayStart) && due.isBefore(todayStart.add(4, "day"));
  });

  return { incompleteHomeworks, dueToday, dueWithin3Days };
};

export const computeUpcomingExams = (
  exams: ExamItem[],
  todayStart: dayjs.Dayjs,
  next7DaysEnd: dayjs.Dayjs,
) =>
  exams
    .filter((exam) => exam.date)
    .filter((exam) => {
      const date = dayjs(exam.date);
      return !date.isBefore(todayStart) && date.isBefore(next7DaysEnd);
    })
    .sort((a, b) => {
      const d = dayjs(a.date).valueOf() - dayjs(b.date).valueOf();
      if (d !== 0) return d;
      return toMinutes(a.startTime) - toMinutes(b.startTime);
    })
    .slice(0, 6);

export const findBusiestDate = (allScheduleTimes: ScheduleTimeItem[]) => {
  if (allScheduleTimes.length === 0) return null;
  const dayStats = new Map<string, { totalMinutes: number; count: number }>();
  for (const item of allScheduleTimes) {
    const key = dayjs(item.date).format("YYYY-MM-DD");
    const current = dayStats.get(key) ?? { totalMinutes: 0, count: 0 };
    current.totalMinutes += Math.max(
      toMinutes(item.endTime) - toMinutes(item.startTime),
      0,
    );
    current.count += 1;
    dayStats.set(key, current);
  }

  let bestKey: string | null = null;
  let bestTotalMinutes = -1;
  let bestCount = -1;
  for (const [key, stats] of dayStats.entries()) {
    if (
      stats.totalMinutes > bestTotalMinutes ||
      (stats.totalMinutes === bestTotalMinutes && stats.count > bestCount) ||
      (stats.totalMinutes === bestTotalMinutes &&
        stats.count === bestCount &&
        bestKey &&
        dayjs(key).isBefore(dayjs(bestKey)))
    ) {
      bestKey = key;
      bestTotalMinutes = stats.totalMinutes;
      bestCount = stats.count;
    }
  }

  return bestKey ? dayjs(bestKey) : null;
};

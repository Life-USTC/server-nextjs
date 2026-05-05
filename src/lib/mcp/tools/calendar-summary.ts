import { redactCalendarFeedLocation } from "@/lib/mcp/compact-payload";
import { shanghaiDayjs } from "@/lib/time/shanghai-dayjs";

type CalendarSubscriptionSummaryInput = {
  userId: unknown;
  sections: Array<{
    id: number;
    jwId: number;
    code: string;
    course: {
      jwId: number;
      code: string;
      namePrimary: string;
      nameSecondary: string | null;
    } | null;
    semester: {
      id: number;
      jwId: number;
      code: string;
      nameCn: string;
      startDate?: Date | string | null;
      endDate?: Date | string | null;
    } | null;
  }>;
  calendarPath: string | null;
  calendarUrl: string | null;
  note: string;
};

export function summarizeCalendarSubscription(
  subscription: CalendarSubscriptionSummaryInput,
) {
  const now = shanghaiDayjs();
  const currentSemesterSections = subscription.sections.filter((section) => {
    const startDate = section.semester?.startDate;
    const endDate = section.semester?.endDate;
    const start = startDate ? shanghaiDayjs(startDate) : null;
    const end = endDate ? shanghaiDayjs(endDate) : null;
    return (
      (!start || now.isAfter(start, "day") || now.isSame(start, "day")) &&
      (!end || now.isBefore(end, "day") || now.isSame(end, "day"))
    );
  });

  return {
    userId: typeof subscription.userId === "string" ? subscription.userId : "",
    sectionCount: subscription.sections.length,
    currentSemesterSectionCount: currentSemesterSections.length,
    currentSemesterSections: currentSemesterSections.map((section) => ({
      id: section.id,
      jwId: section.jwId,
      code: section.code,
      course: section.course
        ? {
            jwId: section.course.jwId,
            code: section.course.code,
            namePrimary: section.course.namePrimary,
            nameSecondary: section.course.nameSecondary,
          }
        : null,
      semester: section.semester
        ? {
            id: section.semester.id,
            jwId: section.semester.jwId,
            code: section.semester.code,
            nameCn: section.semester.nameCn,
          }
        : null,
    })),
    calendarPath: redactCalendarFeedLocation(subscription.calendarPath),
    calendarUrl: redactCalendarFeedLocation(subscription.calendarUrl),
    note: subscription.note,
  };
}

export function summarizeCalendarSubscriptionBrief(
  subscription: CalendarSubscriptionSummaryInput,
) {
  const summary = summarizeCalendarSubscription(subscription);
  return {
    userId: summary.userId,
    sectionCount: summary.sectionCount,
    currentSemesterSectionCount: summary.currentSemesterSectionCount,
    calendarPath: summary.calendarPath,
    calendarUrl: summary.calendarUrl,
    note: summary.note,
  };
}

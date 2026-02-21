import dayjs from "dayjs";
import type { CalendarEvent } from "@/components/event-calendar";
import type { Prisma } from "@/generated/prisma/client";

export type SubscriptionSchedule = Prisma.ScheduleGetPayload<{
  include: {
    room: {
      include: {
        building: {
          include: {
            campus: true;
          };
        };
      };
    };
    teachers: true;
  };
}> & {
  room: {
    namePrimary: string;
    building: {
      namePrimary: string;
      campus: { namePrimary: string } | null;
    } | null;
  } | null;
  teachers: Array<{ namePrimary: string }>;
};

type SemesterGroupSection = {
  semester: {
    id: number | null;
    nameCn: string | null;
    startDate: Date | null;
  } | null;
};

export type GroupedSections<TSection> = {
  key: string;
  label: string;
  startDate: Date | null;
  sections: TSection[];
};

export const formatDetailValue = (
  value: string | number | null | undefined,
) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
};

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

export const getCalendarMonthStart = (events: CalendarEvent[]) => {
  if (events.length === 0) {
    return dayjs().startOf("month").toDate();
  }

  const datedEvents = events
    .filter((event): event is CalendarEvent & { date: Date } =>
      Boolean(event.date),
    )
    .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());
  const today = dayjs().startOf("day");
  const firstEventDate = datedEvents[0]?.date ?? today.toDate();
  const lastEventDate = datedEvents.at(-1)?.date ?? today.toDate();
  const isOngoing =
    !today.isBefore(dayjs(firstEventDate).startOf("day")) &&
    !today.isAfter(dayjs(lastEventDate).startOf("day"));
  const fallbackStartDate = firstEventDate ?? today.toDate();

  return dayjs(isOngoing ? today : fallbackStartDate)
    .startOf("month")
    .toDate();
};

export const groupSectionsBySemester = <TSection extends SemesterGroupSection>(
  sections: TSection[],
): GroupedSections<TSection>[] => {
  const groups = sections.reduce((acc, section) => {
    const key = section.semester?.id?.toString() ?? "unknown";
    const label = section.semester?.nameCn ?? "—";
    const startDate = section.semester?.startDate ?? null;
    const existing = acc.get(key) ?? {
      key,
      label,
      startDate,
      sections: [],
    };
    existing.sections.push(section);
    acc.set(key, existing);
    return acc;
  }, new Map<string, GroupedSections<TSection>>());

  return Array.from(groups.values()).sort((a, b) => {
    if (a.startDate && b.startDate) {
      return b.startDate.getTime() - a.startDate.getTime();
    }
    if (a.startDate) return -1;
    if (b.startDate) return 1;
    return b.label.localeCompare(a.label);
  });
};

export const countDistinctSemesterIds = <
  TSection extends { semester: { id: number | null } | null },
>(
  subscriptions: Array<{ sections: TSection[] }>,
) =>
  new Set(
    subscriptions.flatMap((subscription) =>
      subscription.sections
        .map((section) => section.semester?.id)
        .filter((id): id is number => id !== null),
    ),
  ).size;

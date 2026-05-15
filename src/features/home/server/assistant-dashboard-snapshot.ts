import {
  getBusPreference,
  getNextBusDepartures,
} from "@/features/bus/lib/bus-service";
import type { AppLocale } from "@/i18n/config";
import { findCurrentSemester } from "@/lib/current-semester";
import { getPrisma, prisma } from "@/lib/db/prisma";
import { listUserCalendarEvents } from "./calendar-events";

function isUpcomingEventAt(value: string | null | undefined, now: Date) {
  if (!value) return false;
  const timestamp = new Date(value);
  return (
    !Number.isNaN(timestamp.getTime()) && timestamp.getTime() >= now.getTime()
  );
}

export async function getAssistantDashboardSnapshot(input: {
  userId: string;
  locale: AppLocale;
  dayLimit?: number;
  atTime?: Date;
}) {
  const now = input.atTime ?? new Date();
  const dayLimit = input.dayLimit ?? 7;
  const dateTo = new Date(now.getTime() + dayLimit * 24 * 60 * 60 * 1000);
  const currentSemester = await findCurrentSemester(prisma.semester, now);
  const localizedPrisma = getPrisma(input.locale);

  const [
    user,
    subscriptionState,
    events,
    incompleteTodos,
    incompleteTodoCount,
    busPreference,
  ] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: input.userId },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
      },
    }),
    localizedPrisma.user.findUniqueOrThrow({
      where: { id: input.userId },
      select: {
        _count: {
          select: {
            subscribedSections: true,
          },
        },
        subscribedSections: {
          where: currentSemester
            ? { semesterId: currentSemester.id }
            : { id: -1 },
          orderBy: [{ code: "asc" }],
          select: {
            id: true,
            jwId: true,
            code: true,
            course: {
              select: {
                jwId: true,
                code: true,
                namePrimary: true,
                nameSecondary: true,
              },
            },
            semester: {
              select: {
                id: true,
                jwId: true,
                code: true,
                nameCn: true,
              },
            },
            campus: {
              select: {
                id: true,
                namePrimary: true,
                nameSecondary: true,
              },
            },
            teachers: {
              select: {
                id: true,
                namePrimary: true,
                nameSecondary: true,
              },
              orderBy: [{ nameCn: "asc" }],
            },
          },
        },
      },
    }),
    listUserCalendarEvents(input.userId, {
      locale: input.locale,
      dateFrom: now,
      dateTo,
    }),
    prisma.todo.findMany({
      where: {
        userId: input.userId,
        completed: false,
      },
      select: {
        id: true,
        title: true,
        content: true,
        priority: true,
        dueAt: true,
        completed: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 5,
    }),
    prisma.todo.count({
      where: {
        userId: input.userId,
        completed: false,
      },
    }),
    getBusPreference(input.userId),
  ]);

  const nextClass =
    events.find(
      (event) => event.type === "schedule" && isUpcomingEventAt(event.at, now),
    ) ?? null;

  const upcomingDeadlines = events
    .filter(
      (event) =>
        event.type === "homework_due" ||
        event.type === "exam" ||
        event.type === "todo_due",
    )
    .slice(0, 10);

  const nextBus =
    busPreference?.preferredOriginCampusId != null &&
    busPreference?.preferredDestinationCampusId != null
      ? await getNextBusDepartures({
          locale: input.locale,
          originCampusId: busPreference.preferredOriginCampusId,
          destinationCampusId: busPreference.preferredDestinationCampusId,
          atTime: now.toISOString(),
          includeDeparted: busPreference.showDepartedTrips,
          limit: 3,
          userId: input.userId,
        })
      : null;
  const nextUpcomingDeparture =
    nextBus?.departures.find((departure) => departure.status === "upcoming") ??
    null;

  return {
    user,
    currentSemester: currentSemester
      ? {
          id: currentSemester.id,
          jwId: currentSemester.jwId,
          code: currentSemester.code,
          nameCn: currentSemester.nameCn,
          startDate: currentSemester.startDate,
          endDate: currentSemester.endDate,
        }
      : null,
    subscriptions: {
      totalCount: subscriptionState._count.subscribedSections,
      currentSemesterCount: subscriptionState.subscribedSections.length,
      currentSemesterSections: subscriptionState.subscribedSections,
    },
    nextClass,
    upcomingDeadlines,
    upcomingEvents: events.slice(0, 10),
    todos: {
      incompleteCount: incompleteTodoCount,
      items: incompleteTodos,
    },
    bus: {
      preference: busPreference,
      nextDeparture: nextUpcomingDeparture,
      departures: nextBus?.departures ?? [],
    },
  };
}

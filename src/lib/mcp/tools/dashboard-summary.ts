import type { getAssistantDashboardSnapshot } from "@/features/home/server/assistant-dashboard-snapshot";
import { compactMcpPayload } from "@/lib/mcp/compact-payload";
import {
  summarizeBusDeparture,
  summarizeBusDepartureList,
  summarizeCalendarEvent,
  summarizeSectionCard,
  summarizeTodoCard,
} from "@/lib/mcp/tools/event-summary";

type DashboardSnapshot = Awaited<
  ReturnType<typeof getAssistantDashboardSnapshot>
>;
type DashboardSection =
  DashboardSnapshot["subscriptions"]["currentSemesterSections"][number];
type DashboardTodo = DashboardSnapshot["todos"]["items"][number];

function compactSectionList(
  sections: readonly DashboardSection[],
  limit: number,
) {
  return sections
    .slice(0, limit)
    .map((section: DashboardSection) => summarizeSectionCard(section));
}

export function compactDashboardSnapshot(snapshot: DashboardSnapshot) {
  return {
    user: compactMcpPayload(snapshot.user),
    currentSemester: compactMcpPayload(snapshot.currentSemester),
    subscriptions: {
      totalCount: snapshot.subscriptions.totalCount,
      currentSemesterCount: snapshot.subscriptions.currentSemesterCount,
      currentSemesterSections: compactSectionList(
        snapshot.subscriptions.currentSemesterSections,
        5,
      ),
      currentSemesterSectionsTotal:
        snapshot.subscriptions.currentSemesterSections.length,
    },
    nextClass: snapshot.nextClass
      ? summarizeCalendarEvent(snapshot.nextClass)
      : null,
    upcomingDeadlines: {
      total: snapshot.upcomingDeadlines.length,
      items: snapshot.upcomingDeadlines.slice(0, 5).map(summarizeCalendarEvent),
    },
    upcomingEvents: {
      total: snapshot.upcomingEvents.length,
      items: snapshot.upcomingEvents.slice(0, 5).map(summarizeCalendarEvent),
    },
    todos: {
      incompleteCount: snapshot.todos.incompleteCount,
      items: snapshot.todos.items.map((todo: DashboardTodo) =>
        summarizeTodoCard(todo),
      ),
    },
    bus: {
      hasPreference:
        snapshot.bus.preference?.preferredOriginCampusId != null &&
        snapshot.bus.preference?.preferredDestinationCampusId != null,
      preference: snapshot.bus.preference,
      nextDeparture: snapshot.bus.nextDeparture
        ? summarizeBusDeparture(snapshot.bus.nextDeparture)
        : null,
      departures: summarizeBusDepartureList(snapshot.bus.departures, 3),
    },
  };
}

export function summarizeDashboardSnapshot(snapshot: DashboardSnapshot) {
  return {
    user: compactMcpPayload(snapshot.user),
    currentSemester: snapshot.currentSemester
      ? {
          code: snapshot.currentSemester.code,
          nameCn: snapshot.currentSemester.nameCn,
        }
      : null,
    subscriptions: {
      totalCount: snapshot.subscriptions.totalCount,
      currentSemesterCount: snapshot.subscriptions.currentSemesterCount,
      currentSemesterSectionsTotal:
        snapshot.subscriptions.currentSemesterSections.length,
    },
    nextClass: snapshot.nextClass
      ? summarizeCalendarEvent(snapshot.nextClass)
      : null,
    upcomingDeadlines: {
      total: snapshot.upcomingDeadlines.length,
      items: snapshot.upcomingDeadlines.slice(0, 3).map(summarizeCalendarEvent),
    },
    upcomingEvents: {
      total: snapshot.upcomingEvents.length,
      items: snapshot.upcomingEvents.slice(0, 3).map(summarizeCalendarEvent),
    },
    todos: {
      incompleteCount: snapshot.todos.incompleteCount,
    },
    bus: {
      hasPreference:
        snapshot.bus.preference?.preferredOriginCampusId != null &&
        snapshot.bus.preference?.preferredDestinationCampusId != null,
      nextDeparture: snapshot.bus.nextDeparture
        ? summarizeBusDeparture(snapshot.bus.nextDeparture)
        : null,
      departuresCount: snapshot.bus.departures.length,
    },
  };
}

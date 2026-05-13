/**
 * MCP tool integration tests.
 *
 * Shared seed/setup guidance lives in the repo root `AGENTS.md`.
 * Use `bun run test:integration` for the normal entry point.
 *
 * The shared dev-seed anchor comes from `DEV_SEED_ANCHOR`, so date filters and
 * deterministic atTime calls stay aligned with the seeded schedules, exams, and
 * homeworks.
 */

import { DEV_SEED, DEV_SEED_ANCHOR } from "@tools/dev/seed/dev-seed";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { createMcpHarness, type McpHarness } from "./utils/mcp-harness";

const SEED_DATE = DEV_SEED_ANCHOR.date;
const SEED_AT_TIME = DEV_SEED_ANCHOR.recommendedAtTime;

let devUserId: string;
let mcp: McpHarness;

beforeAll(async () => {
  const user = await prisma.user.findFirst({
    where: { username: DEV_SEED.debugUsername },
    select: { id: true },
  });
  if (!user) {
    throw new Error(
      `Dev seed user "${DEV_SEED.debugUsername}" not found. ` +
        "See the repo root `AGENTS.md` for the required DB + seed setup.",
    );
  }
  devUserId = user.id;
  mcp = await createMcpHarness(devUserId);
});

afterAll(async () => {
  await mcp?.close();
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

describe("get_my_profile", () => {
  it("returns the authenticated user's id and username", async () => {
    const profile = await mcp.call<{
      id?: string;
      username?: string | null;
      createdAt?: string;
    }>("get_my_profile");

    expect(profile.id).toBe(devUserId);
    expect(profile.username).toBe(DEV_SEED.debugUsername);
    // Dates are serialized in Asia/Shanghai (+08:00)
    expect(profile.createdAt).toMatch(/\+08:00$/);
  });
});

// ---------------------------------------------------------------------------
// Todos
// ---------------------------------------------------------------------------

describe("todo CRUD — update_my_todo returns updated entity", () => {
  let todoId: string;

  it("creates a todo", async () => {
    const result = await mcp.call<{ success?: boolean; id?: string }>(
      "create_my_todo",
      {
        title: "[integration-test] update returns todo",
        priority: "high",
        dueAt: "2026-05-10",
      },
    );
    expect(result.success).toBe(true);
    expect(typeof result.id).toBe("string");
    todoId = result.id as string;
  });

  it("update_my_todo returns the updated todo entity (not just success: true)", async () => {
    const result = await mcp.call<{
      success?: boolean;
      todo?: {
        id?: string;
        title?: string;
        priority?: string;
        completed?: boolean;
        updatedAt?: string;
      } | null;
    }>("update_my_todo", {
      id: todoId,
      title: "[integration-test] renamed",
      priority: "low",
      completed: true,
    });

    expect(result.success).toBe(true);
    // The updated entity must be echoed — callers must not need a second read.
    expect(result.todo).not.toBeNull();
    expect(result.todo?.id).toBe(todoId);
    expect(result.todo?.title).toBe("[integration-test] renamed");
    expect(result.todo?.priority).toBe("low");
    expect(result.todo?.completed).toBe(true);
    // updatedAt should be a valid Shanghai-offset datetime
    expect(result.todo?.updatedAt).toMatch(/\+08:00$/);
  });

  it("deletes the todo (cleanup)", async () => {
    const result = await mcp.call<{ success?: boolean }>("delete_my_todo", {
      id: todoId,
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Flexible date inputs
// ---------------------------------------------------------------------------

describe("flexDateInputSchema — bare YYYY-MM-DD accepted by date-filter tools", () => {
  it("list_my_schedules accepts bare date strings (no timezone offset)", async () => {
    const result = await mcp.call<{
      schedules?: Array<{ id?: number; date?: string }>;
    }>("list_my_schedules", {
      dateFrom: SEED_DATE, // bare date — would have been rejected by old dateTimeSchema
      dateTo: "2026-05-10",
      limit: 20,
      locale: "zh-cn",
    });

    // Should not error, and the seeded schedules should be returned
    expect(Array.isArray(result.schedules)).toBe(true);
    expect((result.schedules?.length ?? 0) > 0).toBe(true);
    // Every date should fall within the requested window
    for (const schedule of result.schedules ?? []) {
      if (schedule.date) {
        expect(schedule.date >= SEED_DATE).toBe(true);
        expect(schedule.date <= "2026-05-11").toBe(true); // lte "2026-05-10" end-of-day
      }
    }
  });

  it("list_my_exams accepts bare date strings", async () => {
    const result = await mcp.call<{
      exams?: Array<{ id?: number }>;
    }>("list_my_exams", {
      dateFrom: SEED_DATE,
      includeDateUnknown: false,
      limit: 20,
      locale: "zh-cn",
    });

    expect(Array.isArray(result.exams)).toBe(true);
  });

  it("list_my_calendar_events accepts bare date strings", async () => {
    const result = await mcp.call<{
      events?: Array<{ type?: string; at?: string }>;
    }>("list_my_calendar_events", {
      dateFrom: SEED_DATE,
      dateTo: "2026-05-10",
      locale: "zh-cn",
    });

    expect(Array.isArray(result.events)).toBe(true);
    // Should include the seeded schedule events
    expect(
      (result.events ?? []).some((e) =>
        ["schedule", "homework_due", "exam", "todo_due"].includes(e.type ?? ""),
      ),
    ).toBe(true);
  });

  it("returns a descriptive error for a nonsense date string", async () => {
    const result = await mcp.call<{
      success?: boolean;
      message?: string;
    }>("list_my_schedules", {
      dateFrom: "not-a-date",
      limit: 5,
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("not-a-date");
    expect(result.message?.toLowerCase()).toContain("invalid");
  });
});

// ---------------------------------------------------------------------------
// atTime override — reproducible time-sensitive tools
// ---------------------------------------------------------------------------

describe("atTime override — time-sensitive tools are anchored to SEED_DATE", () => {
  it("get_my_7days_timeline with atTime returns the seed window and correct range", async () => {
    const result = await mcp.call<{
      range?: { from?: string; to?: string };
      total?: number;
      events?: Array<{ type?: string; at?: string }>;
    }>("get_my_7days_timeline", {
      locale: "zh-cn",
      atTime: SEED_AT_TIME,
    });

    // Range anchored to seed date
    expect(result.range?.from).toMatch(new RegExp(`^${SEED_DATE}`));
    expect(result.range?.to).toMatch(/^2026-05-06/);
    expect(typeof result.total).toBe("number");
    expect(Array.isArray(result.events)).toBe(true);

    // Seeded schedules and homework deadlines must appear in this window
    expect((result.total ?? 0) > 0).toBe(true);
    expect((result.events ?? []).some((e) => e.type === "schedule")).toBe(true);
  });

  it("get_my_7days_timeline summary mode with atTime returns grouped collection", async () => {
    const result = await mcp.call<{
      total?: number;
      events?: {
        total?: number;
        byType?: { schedule?: number; homework_due?: number };
        days?: Array<{ date?: string; total?: number }>;
        items?: Array<{ type?: string }>;
      };
    }>("get_my_7days_timeline", {
      locale: "zh-cn",
      atTime: SEED_AT_TIME,
      mode: "summary",
    });

    expect(result.events?.total).toBe(result.total);
    expect(typeof result.events?.byType?.schedule).toBe("number");
    expect(result.events?.byType?.schedule).toBeGreaterThan(0);
    expect((result.events?.days?.length ?? 0) > 0).toBe(true);
    // Days should fall within the seed window
    for (const day of result.events?.days ?? []) {
      expect(day.date).toMatch(/^2026-0[45]/);
    }
  });

  it("get_upcoming_deadlines with atTime only returns events after the anchor", async () => {
    const result = await mcp.call<{
      total?: number;
      deadlines?: Array<{ type?: string; at?: string }>;
    }>("get_upcoming_deadlines", {
      locale: "zh-cn",
      dayLimit: 14,
      atTime: SEED_AT_TIME,
    });

    expect(typeof result.total).toBe("number");
    expect(
      (result.deadlines ?? []).every((d) =>
        ["homework_due", "exam", "todo_due"].includes(d.type ?? ""),
      ),
    ).toBe(true);
    // All deadlines must be on or after the anchor date
    for (const deadline of result.deadlines ?? []) {
      if (deadline.at) {
        expect(deadline.at >= SEED_DATE).toBe(true);
      }
    }
  });

  it("get_my_overview with atTime reflects the seed day's schedule count", async () => {
    const result = await mcp.call<{
      overview?: {
        pendingTodosCount?: number;
        todaySchedulesCount?: number;
        upcomingExamsCount?: number;
      };
    }>("get_my_overview", {
      locale: "zh-cn",
      atTime: SEED_AT_TIME,
    });

    expect(typeof result.overview?.pendingTodosCount).toBe("number");
    // The seed day has seeded schedules so today's count should be > 0
    expect((result.overview?.todaySchedulesCount ?? 0) > 0).toBe(true);
    expect(typeof result.overview?.upcomingExamsCount).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// list_schedules_by_section — new date filter
// ---------------------------------------------------------------------------

describe("list_schedules_by_section — date range filter", () => {
  it("returns all schedules for the section when no date filter is given", async () => {
    const all = await mcp.call<{
      found?: boolean;
      schedules?: Array<{ id?: number; date?: string }>;
    }>("list_schedules_by_section", {
      sectionJwId: DEV_SEED.section.jwId,
      locale: "zh-cn",
    });

    expect(all.found).toBe(true);
    expect((all.schedules?.length ?? 0) > 0).toBe(true);
  });

  it("narrows results to a specific week with dateFrom+dateTo bare dates", async () => {
    const week = await mcp.call<{
      found?: boolean;
      schedules?: Array<{ id?: number; date?: string }>;
    }>("list_schedules_by_section", {
      sectionJwId: DEV_SEED.section.jwId,
      dateFrom: SEED_DATE,
      dateTo: "2026-05-05",
      locale: "zh-cn",
    });

    expect(week.found).toBe(true);
    // Should only include schedules within the window
    for (const s of week.schedules ?? []) {
      if (s.date) {
        const d = s.date.slice(0, 10);
        expect(d >= SEED_DATE).toBe(true);
        expect(d <= "2026-05-05").toBe(true);
      }
    }
  });

  it("returns empty schedules array for a window with no matching schedules", async () => {
    const result = await mcp.call<{
      found?: boolean;
      schedules?: unknown[];
    }>("list_schedules_by_section", {
      sectionJwId: DEV_SEED.section.jwId,
      dateFrom: "2020-01-01",
      dateTo: "2020-01-07",
      locale: "zh-cn",
    });

    expect(result.found).toBe(true);
    expect(result.schedules).toHaveLength(0);
  });

  it("returns error message for invalid dateFrom", async () => {
    const result = await mcp.call<{
      found?: boolean;
      message?: string;
      schedules?: unknown[];
    }>("list_schedules_by_section", {
      sectionJwId: DEV_SEED.section.jwId,
      dateFrom: "yesterday",
      locale: "zh-cn",
    });

    expect(result.found).toBe(true);
    expect(result.schedules).toHaveLength(0);
    expect(result.message).toContain("yesterday");
  });
});

describe("query_schedules — flexible date filters", () => {
  it("accepts bare dates and returns paginated public schedules", async () => {
    const result = await mcp.call<{
      data?: Array<{ date?: string }>;
      pagination?: { total?: number };
    }>("query_schedules", {
      sectionJwId: DEV_SEED.section.jwId,
      dateFrom: SEED_DATE,
      dateTo: "2026-05-05",
      locale: "zh-cn",
    });

    expect(result.pagination?.total).toBeGreaterThan(0);
    for (const s of result.data ?? []) {
      if (s.date) {
        const d = s.date.slice(0, 10);
        expect(d >= SEED_DATE).toBe(true);
        expect(d <= "2026-05-05").toBe(true);
      }
    }
  });

  it("returns a descriptive payload for invalid date filters", async () => {
    const result = await mcp.call<{
      success?: boolean;
      message?: string;
    }>("query_schedules", {
      sectionJwId: DEV_SEED.section.jwId,
      dateFrom: "yesterday",
      locale: "zh-cn",
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("yesterday");
  });
});

// ---------------------------------------------------------------------------
// Dashboard snapshot — compact shape verification
// ---------------------------------------------------------------------------

describe("get_my_dashboard — default mode compactness", () => {
  it("scheduleGroup and roomType are stripped from nextClass payload", async () => {
    const dashboard = await mcp.call<{
      nextClass?: {
        payload?: {
          scheduleGroup?: unknown;
          roomType?: unknown;
          date?: string;
          weekday?: number;
        };
      };
      subscriptions?: { currentSemesterSectionsTotal?: number };
      todos?: { incompleteCount?: number };
    }>("get_my_dashboard", { locale: "zh-cn" });

    if (dashboard.nextClass?.payload) {
      expect(dashboard.nextClass.payload).not.toHaveProperty("scheduleGroup");
      expect(dashboard.nextClass.payload).not.toHaveProperty("roomType");
    }
    expect(typeof dashboard.subscriptions?.currentSemesterSectionsTotal).toBe(
      "number",
    );
    expect(typeof dashboard.todos?.incompleteCount).toBe("number");
  });

  it("summary mode is materially smaller than default mode", async () => {
    const def = JSON.stringify(
      await mcp.callTool("get_my_dashboard", {
        locale: "zh-cn",
        mode: "default",
      }),
    );
    const sum = JSON.stringify(
      await mcp.callTool("get_my_dashboard", {
        locale: "zh-cn",
        mode: "summary",
      }),
    );
    expect(sum.length).toBeLessThan(def.length);
  });
});

// ---------------------------------------------------------------------------
// Bus tools — departure omits repeated campus objects
// ---------------------------------------------------------------------------

describe("get_next_buses — default mode drops repeated campus objects", () => {
  it("accepts date-only atTime for deterministic departure queries", async () => {
    const result = await mcp.call<{ totalRoutes?: number }>("get_next_buses", {
      locale: "zh-cn",
      originCampusId: DEV_SEED.bus.originCampusId,
      destinationCampusId: DEV_SEED.bus.destinationCampusId,
      atTime: SEED_DATE,
    });

    expect(result.totalRoutes).toBeGreaterThan(0);
  });

  it("departure items omit originCampus and destinationCampus", async () => {
    const result = await mcp.call<{
      originCampus?: { id?: number };
      destinationCampus?: { id?: number };
      totalRoutes?: number;
      departures?: Array<{
        routeId?: number;
        originCampus?: unknown;
        destinationCampus?: unknown;
      }>;
      message?: string | null;
    }>("get_next_buses", {
      locale: "zh-cn",
      originCampusId: DEV_SEED.bus.originCampusId,
      destinationCampusId: DEV_SEED.bus.destinationCampusId,
    });

    expect(result.totalRoutes).toBeGreaterThan(0);
    if ((result.departures?.length ?? 0) > 0) {
      // Campus info is at the top level, not repeated per departure
      expect(result.originCampus).toBeDefined();
      for (const dep of result.departures ?? []) {
        expect(dep).not.toHaveProperty("originCampus");
        expect(dep).not.toHaveProperty("destinationCampus");
      }
    } else {
      // No departures → guidance message should be present
      expect(typeof result.message).toBe("string");
    }
  });
});

// ---------------------------------------------------------------------------
// Section subscription tools — compact mutation responses
// ---------------------------------------------------------------------------

describe("subscribe_section_by_jw_id — returns action + compact subscription", () => {
  it("subscribing returns action=subscribed or action=already_subscribed", async () => {
    const result = await mcp.call<{
      success?: boolean;
      action?: string;
      sectionJwId?: number;
      subscription?: {
        sectionCount?: number;
        currentSemesterSections?: unknown;
        sections?: unknown;
      } | null;
    }>("subscribe_section_by_jw_id", {
      jwId: DEV_SEED.section.jwId,
      locale: "zh-cn",
    });

    expect(result.success).toBe(true);
    expect(["subscribed", "already_subscribed"]).toContain(result.action);
    expect(result.sectionJwId).toBe(DEV_SEED.section.jwId);
    // Brief subscription — sections list not included in default mode
    expect(result.subscription?.sections).toBeUndefined();
    expect(result.subscription?.currentSemesterSections).toBeUndefined();
    expect(typeof result.subscription?.sectionCount).toBe("number");
  });
});

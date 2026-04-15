/**
 * E2E tests for GET /api/schedules
 *
 * ## Endpoints
 * - `GET /api/schedules` — List schedules with filters and pagination.
 *
 * ## Request
 * - Query: `sectionId` (optional, int), `teacherId` (optional, int),
 *          `roomId` (optional, int), `dateFrom` (optional, date string),
 *          `dateTo` (optional, date string), `weekday` (optional, int 0-6),
 *          `page` (optional), `limit` (optional)
 *
 * ## Response
 * - 200: `{ data: Schedule[], pagination: { page, pageSize, total, totalPages } }`
 *   Each schedule includes: room (with building.campus, roomType), teachers (with department),
 *   section (with course), scheduleGroup
 * - 400: `{ error: string }` on invalid query (e.g. bad dateFrom/dateTo)
 *
 * ## Auth Requirements
 * - Public (no authentication required)
 *
 * ## Edge Cases
 * - room can be null (not all schedules have a room)
 * - Non-matching filters return empty data (not errors)
 * - Invalid dateFrom/dateTo returns 400
 * - Results ordered by date asc, then startTime asc
 */
import { expect, test } from "@playwright/test";
import { DEV_SEED } from "../../../../utils/dev-seed";
import { assertApiContract } from "../../_shared/api-contract";

async function resolveSeedSectionId(
  request: import("@playwright/test").APIRequestContext,
) {
  const response = await request.post("/api/sections/match-codes", {
    data: { codes: [DEV_SEED.section.code] },
  });
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    sections?: Array<{ id?: number; code?: string | null }>;
  };
  const section = body.sections?.find(
    (entry) => entry.code === DEV_SEED.section.code,
  );
  expect(section).toBeDefined();
  // biome-ignore lint/style/noNonNullAssertion: guarded by expect above
  return section!.id!;
}

test.describe("GET /api/schedules", () => {
  test("contract", async ({ request }) => {
    await assertApiContract(request, { routePath: "/api/schedules" });
  });

  test("returns paginated response shape", async ({ request }) => {
    const response = await request.get("/api/schedules");
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      data?: unknown[];
      pagination?: {
        page?: number;
        pageSize?: number;
        total?: number;
        totalPages?: number;
      };
    };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination).toBeDefined();
    expect(typeof body.pagination?.page).toBe("number");
    expect(typeof body.pagination?.pageSize).toBe("number");
    expect(typeof body.pagination?.total).toBe("number");
    expect(typeof body.pagination?.totalPages).toBe("number");
  });

  test("filter by sectionId returns seed schedules", async ({ request }) => {
    const sectionId = await resolveSeedSectionId(request);
    const response = await request.get(
      `/api/schedules?sectionId=${sectionId}&limit=20`,
    );
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      data?: Array<{
        section?: { jwId?: number };
        teachers?: unknown[];
      }>;
    };
    expect(body.data?.length ?? 0).toBeGreaterThan(0);
    expect(
      body.data?.some((item) => item.section?.jwId === DEV_SEED.section.jwId),
    ).toBe(true);
  });

  test("schedules include nested relations", async ({ request }) => {
    const sectionId = await resolveSeedSectionId(request);
    const response = await request.get(
      `/api/schedules?sectionId=${sectionId}&limit=5`,
    );
    expect(response.status()).toBe(200);

    interface ScheduleEntry {
      id: unknown;
      date: unknown;
      weekday: unknown;
      startTime: unknown;
      endTime: unknown;
      section:
        | {
            jwId?: unknown;
            code?: unknown;
            course?: { nameCn?: unknown };
            semester?: unknown;
          }
        | null
        | undefined;
      teachers: unknown[] | undefined;
      room: { name?: unknown; building?: unknown } | null | undefined;
      scheduleGroup: unknown;
    }

    const body = (await response.json()) as {
      data?: ScheduleEntry[];
    };
    const first = body.data?.[0];
    expect(first).toBeDefined();
    if (!first) return;

    // Scalar fields
    expect(typeof first.id).toBe("number");
    expect(typeof first.date).toBe("string");
    expect(/^\d{4}-\d{2}-\d{2}/.test(first.date as string)).toBe(true);
    expect(typeof first.weekday).toBe("number");
    expect(
      (first.weekday as number) >= 0 && (first.weekday as number) <= 6,
    ).toBe(true);
    expect(typeof first.startTime).toBe("string");
    expect(typeof first.endTime).toBe("string");

    // Section nested relations
    expect(first.section).toBeDefined();
    expect(typeof first.section?.code).toBe("string");
    expect(typeof first.section?.course?.nameCn).toBe("string");
    expect(Object.hasOwn(first.section as object, "semester")).toBe(true);

    // Teachers array
    expect(Array.isArray(first.teachers)).toBe(true);

    // room is nullable — only assert shape if present
    if (first.room) {
      expect(Object.hasOwn(first.room, "name")).toBe(true);
    }
  });

  test("non-matching sectionId returns empty data", async ({ request }) => {
    const response = await request.get("/api/schedules?sectionId=999999999");
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      data?: unknown[];
      pagination?: { total?: number };
    };
    expect(body.data).toEqual([]);
    expect(body.pagination?.total).toBe(0);
  });

  test("invalid dateFrom returns 400", async ({ request }) => {
    const response = await request.get("/api/schedules?dateFrom=not-a-date");
    expect(response.status()).toBe(400);
  });

  test("limit param controls page size", async ({ request }) => {
    const response = await request.get("/api/schedules?limit=1");
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      data?: unknown[];
      pagination?: { pageSize?: number };
    };
    expect(body.data?.length).toBeLessThanOrEqual(1);
    expect(body.pagination?.pageSize).toBe(1);
  });
});

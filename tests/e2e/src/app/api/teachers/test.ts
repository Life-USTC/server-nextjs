/**
 * E2E tests for GET /api/teachers
 *
 * ## Endpoints
 * - `GET /api/teachers` — List teachers with optional department/search filters and pagination.
 *
 * ## Request
 * - Query: `departmentId` (optional, integer), `search` (optional, matches nameCn/nameEn/code),
 *          `page` (optional), `limit` (optional)
 *
 * ## Response
 * - 200: `{ data: Teacher[], pagination: { page, pageSize, total, totalPages } }`
 *   Each teacher includes `department`, `teacherTitle`, `_count.sections`
 * - 400: `{ error: string }` on invalid query
 *
 * ## Auth Requirements
 * - Public (no authentication required)
 *
 * ## Edge Cases
 * - Non-matching search returns empty data array (not an error)
 * - Non-numeric departmentId is silently ignored (parsed via parseOptionalInt)
 * - Results ordered by nameCn ascending
 */
import { expect, test } from "@playwright/test";
import { DEV_SEED } from "../../../../utils/dev-seed";
import { assertApiContract } from "../../_shared/api-contract";

test.describe("GET /api/teachers", () => {
  test("contract", async ({ request }) => {
    await assertApiContract(request, { routePath: "/api/teachers" });
  });

  test("returns paginated response shape", async ({ request }) => {
    const response = await request.get("/api/teachers");
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
    expect(body.pagination?.totalPages).toBeGreaterThanOrEqual(1);
  });

  test("search by teacher code returns seed teacher", async ({ request }) => {
    const response = await request.get(
      `/api/teachers?search=${encodeURIComponent(DEV_SEED.teacher.code)}`,
    );
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      data?: Array<{ code?: string | null; nameCn?: string }>;
    };
    const teacher = body.data?.find(
      (item) => item.code === DEV_SEED.teacher.code,
    );
    expect(teacher).toBeDefined();
    expect(teacher?.nameCn).toBe(DEV_SEED.teacher.nameCn);
  });

  test("search by Chinese name returns seed teacher", async ({ request }) => {
    const response = await request.get(
      `/api/teachers?search=${encodeURIComponent(DEV_SEED.teacher.nameCn)}`,
    );
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      data?: Array<{ nameCn?: string }>;
    };
    expect(
      body.data?.some((item) => item.nameCn === DEV_SEED.teacher.nameCn),
    ).toBe(true);
  });

  test("non-matching search returns empty data", async ({ request }) => {
    const response = await request.get(
      "/api/teachers?search=ZZZZZ_NONEXISTENT_TEACHER_99999",
    );
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      data?: unknown[];
      pagination?: { total?: number; totalPages?: number };
    };
    expect(body.data).toEqual([]);
    expect(body.pagination?.total).toBe(0);
    expect(body.pagination?.totalPages).toBe(1);
  });

  test("page param navigates results", async ({ request }) => {
    const response = await request.get("/api/teachers?page=1");
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      pagination?: { page?: number };
    };
    expect(body.pagination?.page).toBe(1);
  });
});

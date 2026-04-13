/**
 * E2E tests for GET /api/courses
 *
 * ## Endpoints
 * - `GET /api/courses` — List courses with optional search and pagination.
 *
 * ## Request
 * - Query: `search` (optional, matches nameCn/nameEn/code, case-insensitive),
 *          `page` (optional, default 1), `limit` (optional, default pageSize)
 *
 * ## Response
 * - 200: `{ data: Course[], pagination: { page, pageSize, total, totalPages } }`
 * - 400: `{ error: string }` on invalid query
 *
 * ## Auth Requirements
 * - Public (no authentication required)
 *
 * ## Edge Cases
 * - Non-matching search returns empty data array (not an error)
 * - totalPages is always >= 1, even when total is 0
 * - Search is case-insensitive across nameCn, nameEn, and code fields
 */
import { expect, test } from "@playwright/test";
import { DEV_SEED } from "../../../../utils/dev-seed";
import { assertApiContract } from "../../_shared/api-contract";

test.describe("GET /api/courses", () => {
  test("contract", async ({ request }) => {
    await assertApiContract(request, { routePath: "/api/courses" });
  });

  test("detail contract", async ({ request }) => {
    await assertApiContract(request, { routePath: "/api/courses/[jwId]" });
  });

  test("returns paginated response shape", async ({ request }) => {
    const response = await request.get("/api/courses");
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

  test("search by course code returns seed course", async ({ request }) => {
    const response = await request.get(
      `/api/courses?search=${encodeURIComponent(DEV_SEED.course.code)}`,
    );
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      data?: Array<{ jwId?: number; code?: string; nameCn?: string }>;
    };
    const course = body.data?.find(
      (item) => item.jwId === DEV_SEED.course.jwId,
    );
    expect(course).toBeDefined();
    expect(course?.code).toBe(DEV_SEED.course.code);
    expect(course?.nameCn).toBe(DEV_SEED.course.nameCn);
  });

  test("search by Chinese name returns seed course", async ({ request }) => {
    const response = await request.get(
      `/api/courses?search=${encodeURIComponent(DEV_SEED.course.nameCn)}`,
    );
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      data?: Array<{ jwId?: number; nameCn?: string }>;
    };
    expect(body.data?.some((item) => item.jwId === DEV_SEED.course.jwId)).toBe(
      true,
    );
  });

  test("non-matching search returns empty data", async ({ request }) => {
    const response = await request.get(
      "/api/courses?search=ZZZZZ_NONEXISTENT_COURSE_99999",
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
    const response = await request.get("/api/courses?page=1");
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      pagination?: { page?: number };
    };
    expect(body.pagination?.page).toBe(1);
  });

  test("detail route returns seed course with sections", async ({
    request,
  }) => {
    const response = await request.get(`/api/courses/${DEV_SEED.course.jwId}`);
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      jwId?: number;
      code?: string;
      nameCn?: string;
      sections?: Array<{ jwId?: number; code?: string }>;
    };
    expect(body.jwId).toBe(DEV_SEED.course.jwId);
    expect(body.code).toBe(DEV_SEED.course.code);
    expect(body.nameCn).toBe(DEV_SEED.course.nameCn);
    expect(
      body.sections?.some((section) => section.jwId === DEV_SEED.section.jwId),
    ).toBe(true);
  });
});

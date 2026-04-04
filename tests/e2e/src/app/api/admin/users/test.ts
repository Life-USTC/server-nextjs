/**
 * E2E tests for GET /api/admin/users
 *
 * Admin-only endpoint that returns a paginated list of users.
 *
 * - GET returns `{ data, pagination }` with user objects
 *   containing id, name, username, isAdmin, email, createdAt
 * - Supports `search` query for filtering by id, name, username, or email
 * - Supports `page` and `limit` pagination parameters (max limit 100)
 * - Returns 401 for unauthenticated or non-admin requests
 * - Returns 400 for invalid query parameters
 */
import { expect, test } from "@playwright/test";
import { signInAsDebugUser, signInAsDevAdmin } from "../../../../../utils/auth";
import { DEV_SEED } from "../../../../../utils/dev-seed";
import { assertApiContract } from "../../../_shared/api-contract";

const BASE = "/api/admin/users";

test.describe("GET /api/admin/users", () => {
  test("api contract", async ({ request }) => {
    await assertApiContract(request, { routePath: BASE });
  });

  test("unauthenticated request returns 401", async ({ request }) => {
    const response = await request.get(BASE);
    expect(response.status()).toBe(401);
  });

  test("non-admin authenticated user returns 401", async ({ page }) => {
    await signInAsDebugUser(page, "/");
    const response = await page.request.get(BASE);
    expect(response.status()).toBe(401);
  });

  test("admin can search seed users by username", async ({ page }) => {
    await signInAsDevAdmin(page, "/admin");
    const response = await page.request.get(
      `${BASE}?search=${DEV_SEED.debugUsername}`,
    );
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      data?: Array<{
        id?: string;
        username?: string | null;
        isAdmin?: boolean;
      }>;
      pagination?: {
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      };
    };
    expect(
      body.data?.some((item) => item.username === DEV_SEED.debugUsername),
    ).toBe(true);
    expect(body.pagination).toBeDefined();
    expect(typeof body.pagination?.total).toBe("number");
  });

  test("admin can paginate users with limit=1", async ({ page }) => {
    await signInAsDevAdmin(page, "/admin");
    const response = await page.request.get(`${BASE}?page=1&limit=1`);
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      data?: unknown[];
      pagination?: { page: number; pageSize: number; totalPages: number };
    };
    expect(body.data?.length).toBe(1);
    expect(body.pagination?.page).toBe(1);
    expect(body.pagination?.pageSize).toBe(1);
  });
});

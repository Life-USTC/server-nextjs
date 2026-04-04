/**
 * E2E tests for GET /api/users/[userId]/calendar.ics
 *
 * ## Endpoint
 * - `GET /api/users/:userId/calendar.ics` — Generate iCalendar feed for a user's subscriptions
 *
 * ## Auth Modes
 * - Session auth: must be the same user (own calendar only)
 * - Token auth via path: `/api/users/:userId::token/calendar.ics`
 * - Token auth via query: `/api/users/:userId/calendar.ics?token=X`
 *
 * ## Response
 * - 200: `text/calendar; charset=utf-8` with iCalendar data
 * - 401: unauthorized (no session and no token)
 * - 403: forbidden (wrong user or invalid token)
 * - 404: user not found or no calendar items
 *
 * ## Content
 * - Includes subscribed section schedules and exams
 * - Includes incomplete homework with due dates
 * - Includes todos with due dates (excludes completed)
 * - Returns 404 if user has no calendar items at all
 *
 * ## Edge Cases
 * - Path token format: `userId:token` in the [userId] segment
 * - Invalid token for an existing user returns 403
 * - Accessing another user's calendar via session returns 403
 */
import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../../../utils/auth";
import { DEV_SEED } from "../../../../../../utils/dev-seed";
import {
  ensureUserCalendarFeedFixture,
  getCurrentSessionUser,
} from "../../../../../../utils/e2e-db";
import { assertApiContract } from "../../../../_shared/api-contract";

const ROUTE_PATH = "/api/users/[userId]/calendar.ics";

test.describe("GET /api/users/[userId]/calendar.ics", () => {
  test("contract", async ({ request }) => {
    await assertApiContract(request, { routePath: ROUTE_PATH });
  });

  test("returns 401 when not authenticated and no token", async ({
    request,
  }) => {
    const response = await request.get("/api/users/invalid-e2e/calendar.ics");
    expect(response.status()).toBe(401);
  });

  test("returns 403 with invalid token", async ({ request }) => {
    const response = await request.get(
      "/api/users/invalid-e2e/calendar.ics?token=invalid-token",
    );
    expect(response.status()).toBe(403);
  });

  test("returns 403 when accessing another user's calendar", async ({
    page,
  }) => {
    await signInAsDebugUser(page, "/");

    const response = await page.request.get(
      "/api/users/not-the-current-user/calendar.ics",
    );
    expect(response.status()).toBe(403);
  });

  test("returns valid iCalendar for own calendar via session auth", async ({
    page,
  }) => {
    await signInAsDebugUser(page, "/");
    const { id: userId } = await getCurrentSessionUser(page);

    const response = await page.request.get(
      `/api/users/${userId}/calendar.ics`,
    );
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/calendar");

    const body = await response.text();
    expect(body.trim().length).toBeGreaterThan(0);
    expect(body).toContain("BEGIN:VCALENDAR");

    // Seed data should include homework, todos, and exam events
    expect(body).toContain(DEV_SEED.homeworks.title);
    expect(body).toContain(DEV_SEED.todos.dueTodayTitle);
    expect(body).toContain(`${DEV_SEED.course.nameCn} - 期中考试`);

    // Completed todos and deleted homework must not appear
    expect(body).not.toContain(DEV_SEED.todos.completedTitle);
    expect(body).not.toContain("[DEV-SCENARIO] 已删除作业");
  });

  test("returns valid iCalendar via path token (anonymous)", async ({
    page,
    request,
  }) => {
    await signInAsDebugUser(page, "/");
    const { id: userId } = await getCurrentSessionUser(page);
    const feed = ensureUserCalendarFeedFixture(userId);

    // Request with path token, no session
    const response = await request.get(feed.path);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/calendar");

    const body = await response.text();
    expect(body.trim().length).toBeGreaterThan(0);
    expect(body).toContain("BEGIN:VCALENDAR");
  });

  test("returns valid iCalendar via query token (anonymous)", async ({
    page,
    request,
  }) => {
    await signInAsDebugUser(page, "/");
    const { id: userId } = await getCurrentSessionUser(page);
    const feed = ensureUserCalendarFeedFixture(userId);

    // Request with query param token instead of path token
    const response = await request.get(
      `/api/users/${userId}/calendar.ics?token=${feed.token}`,
    );
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/calendar");

    const body = await response.text();
    expect(body).toContain("BEGIN:VCALENDAR");
  });

  test("returns 403 with invalid token for existing user", async ({
    page,
    request,
  }) => {
    await signInAsDebugUser(page, "/");
    const { id: userId } = await getCurrentSessionUser(page);

    const response = await request.get(
      `/api/users/${userId}/calendar.ics?token=bogus-token-e2e`,
    );
    expect(response.status()).toBe(403);
  });
});

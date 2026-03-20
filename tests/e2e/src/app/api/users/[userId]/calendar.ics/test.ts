import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../../../utils/auth";
import { DEV_SEED } from "../../../../../../utils/dev-seed";
import {
  ensureUserCalendarFeedFixture,
  getCurrentSessionUser,
} from "../../../../../../utils/e2e-db";
import { assertApiContract } from "../../../../_shared/api-contract";

test("/api/users/[userId]/calendar.ics", async ({ request }) => {
  await assertApiContract(request, {
    routePath: "/api/users/[userId]/calendar.ics",
  });
});

test("/api/users/[userId]/calendar.ics 仅允许本人访问", async ({ page }) => {
  await signInAsDebugUser(page, "/");

  const { id: userId } = await getCurrentSessionUser(page);

  const selfCalendar = await page.request.get(
    `/api/users/${userId}/calendar.ics`,
  );
  expect(selfCalendar.status()).toBe(200);
  expect(selfCalendar.headers()["content-type"]).toContain("text/calendar");
  const selfCalendarBody = await selfCalendar.text();
  expect(selfCalendarBody.trim().length).toBeGreaterThan(0);
  expect(selfCalendarBody).toContain("BEGIN:VCALENDAR");
  expect(selfCalendarBody).toContain(DEV_SEED.homeworks.title);
  expect(selfCalendarBody).toContain(DEV_SEED.todos.dueTodayTitle);
  expect(selfCalendarBody).toContain(`${DEV_SEED.course.nameCn} - 期中考试`);
  expect(selfCalendarBody).not.toContain(DEV_SEED.todos.completedTitle);
  expect(selfCalendarBody).not.toContain("[DEV-SCENARIO] 已删除作业");

  const forbiddenCalendar = await page.request.get(
    "/api/users/not-the-current-user/calendar.ics",
  );
  expect(forbiddenCalendar.status()).toBe(403);
});

test("/api/users/[userId]/calendar.ics 路径 token 形式可匿名读取非空订阅日历", async ({
  page,
  request,
}) => {
  await signInAsDebugUser(page, "/");
  const { id: userId } = await getCurrentSessionUser(page);
  const feed = ensureUserCalendarFeedFixture(userId);

  const response = await request.get(feed.path);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/calendar");
  const body = await response.text();
  expect(body.trim().length).toBeGreaterThan(0);
  expect(body).toContain("BEGIN:VCALENDAR");
});

test("/api/users/[userId]/calendar.ics 未登录无 token 返回 401", async ({
  request,
}) => {
  const response = await request.get("/api/users/invalid-e2e/calendar.ics");
  expect(response.status()).toBe(401);
});

test("/api/users/[userId]/calendar.ics 未登录带无效 token 返回 403", async ({
  request,
}) => {
  const response = await request.get(
    "/api/users/invalid-e2e/calendar.ics?token=invalid-token",
  );
  expect(response.status()).toBe(403);
});

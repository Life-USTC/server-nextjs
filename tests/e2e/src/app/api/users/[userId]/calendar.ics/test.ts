import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../../../utils/auth";
import { assertApiContract } from "../../../../_shared/api-contract";

test("/api/users/[userId]/calendar.ics", async ({ request }) => {
  await assertApiContract(request, {
    routePath: "/api/users/[userId]/calendar.ics",
  });
});

test("/api/users/[userId]/calendar.ics 仅允许本人访问", async ({ page }) => {
  await signInAsDebugUser(page, "/");

  const sessionResponse = await page.request.get("/api/auth/session");
  expect(sessionResponse.status()).toBe(200);
  const sessionBody = (await sessionResponse.json()) as {
    user?: { id?: string };
  };
  const userId = sessionBody.user?.id;
  expect(userId).toBeTruthy();

  const selfCalendar = await page.request.get(
    `/api/users/${userId}/calendar.ics`,
  );
  expect(selfCalendar.status()).toBe(200);
  expect(selfCalendar.headers()["content-type"]).toContain("text/calendar");

  const forbiddenCalendar = await page.request.get(
    "/api/users/not-the-current-user/calendar.ics",
  );
  expect(forbiddenCalendar.status()).toBe(403);
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

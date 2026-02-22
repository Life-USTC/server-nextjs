import { expect, test } from "@playwright/test";

type ApiCase = {
  method: "get" | "post" | "patch" | "delete" | "put";
  url: string;
  data?: unknown;
  acceptedStatuses: number[];
};

test("openapi 文档接口可访问", async ({ request }) => {
  const response = await request.get("/api/openapi");
  expect(response.status()).toBe(200);

  const body = await response.json();
  expect(body.openapi).toBe("3.1.0");
  expect(body.paths["/api/sections/match-codes"]).toBeTruthy();
  expect(body.paths["/api/homeworks"]).toBeTruthy();
  expect(body.paths["/api/descriptions"]).toBeTruthy();
});

test("match-codes 无效输入返回 400", async ({ request }) => {
  const response = await request.post("/api/sections/match-codes", {
    data: {
      codes: [""],
    },
  });

  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(typeof body.error).toBe("string");
});

test("calendar 路由无效参数返回 400", async ({ request }) => {
  const [sectionCalendar, subscriptionCalendar] = await Promise.all([
    request.get("/api/sections/not-a-number/calendar.ics"),
    request.get("/api/calendar-subscriptions/not-a-number/calendar.ics"),
  ]);

  expect(sectionCalendar.status()).toBe(400);
  expect(subscriptionCalendar.status()).toBe(400);
});

test("homeworks 与 descriptions 非法 payload 返回 400", async ({ request }) => {
  const [homeworkResponse, descriptionResponse] = await Promise.all([
    request.post("/api/homeworks", {
      data: {
        sectionId: "abc",
        title: "",
      },
    }),
    request.post("/api/descriptions", {
      data: {
        targetType: "section",
        targetId: "abc",
        content: "ok",
      },
    }),
  ]);

  expect(homeworkResponse.status()).toBe(400);
  expect(descriptionResponse.status()).toBe(400);
});

test("主要 API 接口在异常输入下不返回 500", async ({ request }) => {
  const cases: ApiCase[] = [
    { method: "get", url: "/api/sections", acceptedStatuses: [200] },
    { method: "get", url: "/api/sections/invalid", acceptedStatuses: [400] },
    {
      method: "get",
      url: "/api/sections/invalid/schedules",
      acceptedStatuses: [400],
    },
    {
      method: "get",
      url: "/api/sections/invalid/schedule-groups",
      acceptedStatuses: [400],
    },
    {
      method: "get",
      url: "/api/sections/invalid/calendar.ics",
      acceptedStatuses: [400],
    },
    { method: "get", url: "/api/teachers", acceptedStatuses: [200] },
    { method: "get", url: "/api/courses", acceptedStatuses: [200] },
    { method: "get", url: "/api/schedules", acceptedStatuses: [200] },
    { method: "get", url: "/api/semesters", acceptedStatuses: [200] },
    {
      method: "post",
      url: "/api/comments",
      data: { targetType: "section", targetId: "x", body: "a" },
      acceptedStatuses: [400, 401],
    },
    {
      method: "get",
      url: "/api/comments?targetType=section&targetId=999999",
      acceptedStatuses: [200],
    },
    {
      method: "patch",
      url: "/api/comments/invalid",
      data: { body: "updated" },
      acceptedStatuses: [401, 404],
    },
    {
      method: "delete",
      url: "/api/comments/invalid",
      acceptedStatuses: [401, 404],
    },
    {
      method: "post",
      url: "/api/comments/invalid/reactions",
      data: { type: "heart" },
      acceptedStatuses: [401, 404],
    },
    {
      method: "delete",
      url: "/api/comments/invalid/reactions",
      data: { type: "heart" },
      acceptedStatuses: [401],
    },
    {
      method: "get",
      url: "/api/homeworks?sectionId=1",
      acceptedStatuses: [200],
    },
    {
      method: "patch",
      url: "/api/homeworks/invalid",
      data: { title: "x" },
      acceptedStatuses: [401, 404],
    },
    {
      method: "delete",
      url: "/api/homeworks/invalid",
      acceptedStatuses: [401, 404],
    },
    {
      method: "put",
      url: "/api/homeworks/invalid/completion",
      data: { completed: true },
      acceptedStatuses: [401, 404],
    },
    {
      method: "get",
      url: "/api/descriptions?targetType=section&targetId=1",
      acceptedStatuses: [200],
    },
    {
      method: "post",
      url: "/api/uploads",
      data: { filename: "a.txt", size: "1" },
      acceptedStatuses: [401, 400],
    },
    { method: "get", url: "/api/uploads", acceptedStatuses: [401] },
    {
      method: "post",
      url: "/api/uploads/complete",
      data: { key: "a", filename: "a" },
      acceptedStatuses: [401, 403, 400],
    },
    {
      method: "patch",
      url: "/api/uploads/invalid",
      data: { filename: "a" },
      acceptedStatuses: [401, 404],
    },
    {
      method: "delete",
      url: "/api/uploads/invalid",
      acceptedStatuses: [401, 404],
    },
    {
      method: "get",
      url: "/api/uploads/invalid/download",
      acceptedStatuses: [401, 404],
    },
    {
      method: "post",
      url: "/api/calendar-subscriptions",
      data: { sectionIds: [] },
      acceptedStatuses: [401, 200],
    },
    {
      method: "get",
      url: "/api/calendar-subscriptions/current",
      acceptedStatuses: [401, 200],
    },
    {
      method: "get",
      url: "/api/calendar-subscriptions/invalid",
      acceptedStatuses: [400],
    },
    {
      method: "patch",
      url: "/api/calendar-subscriptions/invalid",
      data: { sectionIds: [] },
      acceptedStatuses: [400],
    },
    {
      method: "delete",
      url: "/api/calendar-subscriptions/invalid",
      acceptedStatuses: [400],
    },
    {
      method: "post",
      url: "/api/admin/comments/invalid",
      data: { status: "active" },
      acceptedStatuses: [405],
    },
    {
      method: "patch",
      url: "/api/admin/comments/invalid",
      data: { status: "active" },
      acceptedStatuses: [401, 404],
    },
    { method: "get", url: "/api/admin/comments", acceptedStatuses: [401, 200] },
    { method: "get", url: "/api/admin/users", acceptedStatuses: [401, 200] },
    {
      method: "patch",
      url: "/api/admin/users/invalid",
      data: { name: "x" },
      acceptedStatuses: [401, 404],
    },
    {
      method: "get",
      url: "/api/admin/suspensions",
      acceptedStatuses: [401, 200],
    },
    {
      method: "post",
      url: "/api/admin/suspensions",
      data: { userId: "x" },
      acceptedStatuses: [401, 404],
    },
    {
      method: "patch",
      url: "/api/admin/suspensions/invalid",
      acceptedStatuses: [401, 404],
    },
    { method: "get", url: "/api/metadata", acceptedStatuses: [200] },
    {
      method: "post",
      url: "/api/locale",
      data: { locale: "fr-fr" },
      acceptedStatuses: [400],
    },
  ];

  for (const entry of cases) {
    const response = await request.fetch(entry.url, {
      method: entry.method.toUpperCase(),
      data: entry.data,
    });

    expect(response.status(), `${entry.method} ${entry.url}`).toBeGreaterThan(
      0,
    );
    expect(response.status(), `${entry.method} ${entry.url}`).toBeLessThan(500);
    expect(entry.acceptedStatuses, `${entry.method} ${entry.url}`).toContain(
      response.status(),
    );
  }
});

test("启用 query schema 的接口在非法查询参数下返回 400", async ({
  request,
}) => {
  const cases = [
    { url: "/api/sections?courseId=abc", statuses: [400] },
    { url: "/api/schedules?weekday=foo", statuses: [400] },
    { url: "/api/teachers?departmentId=foo", statuses: [400] },
    { url: "/api/courses?page=foo", statuses: [400] },
    {
      url: "/api/comments?targetType=section&targetId=foo",
      statuses: [400],
    },
    {
      url: "/api/descriptions?targetType=section&targetId=",
      statuses: [400],
    },
    { url: "/api/homeworks?sectionId=foo", statuses: [400] },
    { url: "/api/sections/calendar.ics?sectionIds=", statuses: [400] },
    { url: "/api/admin/users?page=foo", statuses: [400, 401] },
    { url: "/api/admin/comments?limit=foo", statuses: [400, 401] },
  ] as const;

  for (const entry of cases) {
    const response = await request.get(entry.url);
    expect(entry.statuses).toContain(response.status());
  }
});

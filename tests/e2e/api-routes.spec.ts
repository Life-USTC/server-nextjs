import { expect, test } from "@playwright/test";

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

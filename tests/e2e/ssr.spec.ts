import { expect, test } from "@playwright/test";

test("公共列表页服务端输出包含 URL 参数", async ({ request }) => {
  const response = await request.get("/sections?search=ssr-sections");
  expect(response.status()).toBe(200);
  const html = await response.text();

  expect(html).toContain('id="main-content"');
  expect(html).toContain("ssr-sections");
});

test("teachers 与 courses 页面服务端输出包含查询参数", async ({ request }) => {
  const [teachersResponse, coursesResponse] = await Promise.all([
    request.get("/teachers?search=ssr-teachers"),
    request.get("/courses?search=ssr-courses"),
  ]);

  expect(teachersResponse.status()).toBe(200);
  expect(coursesResponse.status()).toBe(200);

  const teachersHtml = await teachersResponse.text();
  const coursesHtml = await coursesResponse.text();

  expect(teachersHtml).toContain("ssr-teachers");
  expect(coursesHtml).toContain("ssr-courses");
});

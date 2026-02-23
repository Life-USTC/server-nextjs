import { type APIRequestContext, expect, test } from "@playwright/test";

async function getWithRetry(
  request: APIRequestContext,
  url: string,
  attempts = 3,
) {
  let lastStatus = -1;
  let lastBody: string | null = null;

  for (let index = 0; index < attempts; index += 1) {
    const response = await request.get(url);
    lastStatus = response.status();
    if (lastStatus < 500) {
      return response;
    }

    lastBody = await response.text();
    await new Promise((resolve) => setTimeout(resolve, 200 * (index + 1)));
  }

  throw new Error(
    `GET ${url} failed after ${attempts} attempts (lastStatus=${lastStatus}).\n` +
      (lastBody ? `Body: ${lastBody.slice(0, 500)}` : ""),
  );
}

test("公共列表页服务端输出包含 URL 参数", async ({ request }) => {
  const response = await getWithRetry(request, "/sections?search=ssr-sections");
  expect(response.status()).toBe(200);
  const html = await response.text();

  expect(html).toContain('id="main-content"');
  expect(html).toContain("ssr-sections");
});

test("teachers 与 courses 页面服务端输出包含查询参数", async ({ request }) => {
  const [teachersResponse, coursesResponse] = await Promise.all([
    getWithRetry(request, "/teachers?search=ssr-teachers"),
    getWithRetry(request, "/courses?search=ssr-courses"),
  ]);

  expect(teachersResponse.status()).toBe(200);
  expect(coursesResponse.status()).toBe(200);

  const teachersHtml = await teachersResponse.text();
  const coursesHtml = await coursesResponse.text();

  expect(teachersHtml).toContain("ssr-teachers");
  expect(coursesHtml).toContain("ssr-courses");
});

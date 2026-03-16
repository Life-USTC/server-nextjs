import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../../utils/auth";

test("/api/dashboard-links/visit GET 可重定向到目标链接", async ({
  request,
}) => {
  const response = await request.get("/api/dashboard-links/visit?slug=jw", {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe("https://jw.ustc.edu.cn/");
});

test("/api/dashboard-links/visit POST 登录后可记录点击并重定向", async ({
  page,
}) => {
  await signInAsDebugUser(page, "/?tab=links");

  const response = await page.request.post("/api/dashboard-links/visit", {
    form: {
      slug: "jw",
    },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(303);
  expect(response.headers().location).toBe("https://jw.ustc.edu.cn/");
});

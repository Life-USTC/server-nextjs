import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "./utils/auth";

test("comments 详情页在存在评论时可重定向到真实目标页面", async ({ page }) => {
  await signInAsDebugUser(page);

  const sectionsResponse = await page.request.get("/api/sections?limit=1");
  expect(sectionsResponse.status()).toBe(200);
  const sectionsBody = (await sectionsResponse.json()) as {
    data?: Array<{ id?: number; jwId?: number | null }>;
  };

  const targetSection = sectionsBody.data?.find(
    (entry) => typeof entry.id === "number" && typeof entry.jwId === "number",
  );

  if (!targetSection) {
    await page.goto("/comments/not-existing-comment-id");
    await expect(page.locator("h1")).toHaveText("404");
    return;
  }

  const createCommentResponse = await page.request.post("/api/comments", {
    data: {
      targetType: "section",
      targetId: String(targetSection?.id),
      body: "playwright e2e redirect comment",
    },
  });
  expect(createCommentResponse.status()).toBe(200);
  const createBody = (await createCommentResponse.json()) as { id?: string };
  const commentId = createBody.id;
  expect(typeof commentId).toBe("string");

  await page.goto(`/comments/${commentId}`);

  await expect(page).toHaveURL(
    new RegExp(`/sections/${targetSection?.jwId}(?:\\?.*)?(#.*)?$`),
  );
  expect(page.url()).toContain(`#comment-${commentId}`);
  await expect(page.locator("#main-content")).toBeVisible();
});

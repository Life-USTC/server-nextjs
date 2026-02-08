import { expect, test } from "@playwright/test";

const invalidDynamicPaths = [
  "/comments/not-existing-comment-id",
  "/u/non-existing-username",
  "/u/id/non-existing-user-id",
  "/sections/999999999",
  "/teachers/999999999",
  "/courses/999999999",
];

for (const path of invalidDynamicPaths) {
  test(`无效动态路由 ${path} 返回 404 页面`, async ({ page }) => {
    await page.goto(path);

    await expect(page.locator("h1")).toHaveText("404");
    await expect(page.locator('a[href="/"]').first()).toBeVisible();
  });
}

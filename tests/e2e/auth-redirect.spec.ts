import { expect, test } from "@playwright/test";

const protectedPaths = [
  "/admin",
  "/admin/moderation",
  "/admin/users",
  "/dashboard",
  "/dashboard/comments",
  "/dashboard/homeworks",
  "/dashboard/subscriptions/sections",
  "/dashboard/uploads",
  "/settings",
  "/settings/accounts",
  "/settings/comments",
  "/settings/content",
  "/settings/danger",
  "/settings/profile",
  "/settings/uploads",
];

for (const path of protectedPaths) {
  test(`未登录访问 ${path} 会跳转到登录页`, async ({ page }) => {
    await page.goto(path);

    await expect(page).toHaveURL(/\/signin(?:\?.*)?$/);
    await expect(page.getByRole("button", { name: /USTC/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /GitHub/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Google/i })).toBeVisible();
  });
}

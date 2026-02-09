import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "./utils/auth";

type ProtectedRouteCase = {
  path: string;
  expectedAfterLogin: string;
  expectNotFoundWhenLoggedIn?: boolean;
};

const protectedRouteCases: ProtectedRouteCase[] = [
  {
    path: "/admin",
    expectedAfterLogin: "/admin",
    expectNotFoundWhenLoggedIn: true,
  },
  {
    path: "/admin/moderation",
    expectedAfterLogin: "/admin/moderation",
    expectNotFoundWhenLoggedIn: true,
  },
  {
    path: "/admin/users",
    expectedAfterLogin: "/admin/users",
    expectNotFoundWhenLoggedIn: true,
  },
  { path: "/dashboard", expectedAfterLogin: "/dashboard" },
  { path: "/dashboard/comments", expectedAfterLogin: "/dashboard/comments" },
  { path: "/dashboard/homeworks", expectedAfterLogin: "/dashboard/homeworks" },
  {
    path: "/dashboard/subscriptions/sections",
    expectedAfterLogin: "/dashboard/subscriptions/sections",
  },
  { path: "/dashboard/uploads", expectedAfterLogin: "/dashboard/uploads" },
  { path: "/settings", expectedAfterLogin: "/settings/profile" },
  { path: "/settings/accounts", expectedAfterLogin: "/settings/accounts" },
  { path: "/settings/comments", expectedAfterLogin: "/dashboard/comments" },
  { path: "/settings/content", expectedAfterLogin: "/settings/content" },
  { path: "/settings/danger", expectedAfterLogin: "/settings/danger" },
  { path: "/settings/profile", expectedAfterLogin: "/settings/profile" },
  { path: "/settings/uploads", expectedAfterLogin: "/dashboard/uploads" },
];

for (const routeCase of protectedRouteCases) {
  test(`访问受保护页面 ${routeCase.path} 的鉴权流程符合预期`, async ({
    page,
  }) => {
    await page.goto(routeCase.path);

    await expect(page).toHaveURL(/\/signin(?:\?.*)?$/);
    await expect(page.getByRole("button", { name: /USTC/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /GitHub/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Google/i })).toBeVisible();

    await signInAsDebugUser(page, routeCase.path, routeCase.expectedAfterLogin);

    if (routeCase.expectNotFoundWhenLoggedIn) {
      await expect(page.locator("h1")).toHaveText("404");
      await expect(page).toHaveURL(new RegExp(`${routeCase.path}(?:\\?.*)?$`));
      return;
    }

    await expect(page).toHaveURL(
      new RegExp(`${routeCase.expectedAfterLogin}(?:\\?.*)?$`),
    );
    await expect(page.locator("#main-content")).toBeVisible();
  });
}

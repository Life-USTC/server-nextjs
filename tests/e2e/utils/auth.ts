import { expect, type Page } from "@playwright/test";

const DEV_DEBUG_LOGIN_BUTTON = /Debug User \(Dev\)|调试用户（开发）/i;
const DEV_ADMIN_LOGIN_BUTTON = /Admin User \(Dev\)|调试管理员（开发）/i;

export async function signInAsDebugUser(
  page: Page,
  callbackPath = "/",
  expectedPath = callbackPath,
) {
  await page.goto(`/signin?callbackUrl=${encodeURIComponent(callbackPath)}`);
  await page
    .getByRole("button", { name: DEV_DEBUG_LOGIN_BUTTON })
    .first()
    .click();

  const expectedPathPattern = expectedPath === "/" ? "\\/$" : expectedPath;
  await expect(page).toHaveURL(new RegExp(`${expectedPathPattern}(?:\\?.*)?$`));
  await expect(page.locator("#main-content")).toBeVisible();
}

export async function signInAsDevAdmin(
  page: Page,
  callbackPath = "/",
  expectedPath = callbackPath,
) {
  await page.goto(`/signin?callbackUrl=${encodeURIComponent(callbackPath)}`);
  await page
    .getByRole("button", { name: DEV_ADMIN_LOGIN_BUTTON })
    .first()
    .click();

  const expectedPathPattern = expectedPath === "/" ? "\\/$" : expectedPath;
  await expect(page).toHaveURL(new RegExp(`${expectedPathPattern}(?:\\?.*)?$`));
  await expect(page.locator("#main-content")).toBeVisible();
}

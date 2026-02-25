import { expect, type Page } from "@playwright/test";
import { gotoAndWaitForReady, waitForUiSettled } from "./page-ready";

const DEV_DEBUG_LOGIN_BUTTON = /Debug User \(Dev\)|调试用户（开发）/i;
const DEV_ADMIN_LOGIN_BUTTON = /Admin User \(Dev\)|调试管理员（开发）/i;

export async function signInAsDebugUser(
  page: Page,
  callbackPath = "/",
  expectedPath = callbackPath,
) {
  await gotoAndWaitForReady(
    page,
    `/signin?callbackUrl=${encodeURIComponent(callbackPath)}`,
  );
  await page
    .getByRole("button", { name: DEV_DEBUG_LOGIN_BUTTON })
    .first()
    .click();

  const expectedPathPattern = expectedPath === "/" ? "\\/$" : expectedPath;
  await expect(page).toHaveURL(new RegExp(`${expectedPathPattern}(?:\\?.*)?$`));
  await waitForUiSettled(page);
  await expect(page.locator("#main-content")).toBeVisible();
  const sessionResponse = await page.request.get("/api/auth/session");
  expect(sessionResponse.status()).toBe(200);
  const session = (await sessionResponse.json()) as {
    user?: { id?: string };
  };
  expect(typeof session.user?.id).toBe("string");
}

export async function signInAsDevAdmin(
  page: Page,
  callbackPath = "/",
  expectedPath = callbackPath,
) {
  await gotoAndWaitForReady(
    page,
    `/signin?callbackUrl=${encodeURIComponent(callbackPath)}`,
  );
  await page
    .getByRole("button", { name: DEV_ADMIN_LOGIN_BUTTON })
    .first()
    .click();

  const expectedPathPattern = expectedPath === "/" ? "\\/$" : expectedPath;
  await expect(page).toHaveURL(new RegExp(`${expectedPathPattern}(?:\\?.*)?$`));
  await waitForUiSettled(page);
  await expect(page.locator("#main-content")).toBeVisible();
  const sessionResponse = await page.request.get("/api/auth/session");
  expect(sessionResponse.status()).toBe(200);
  const session = (await sessionResponse.json()) as {
    user?: { id?: string; isAdmin?: boolean };
  };
  expect(typeof session.user?.id).toBe("string");
  expect(session.user?.isAdmin).toBe(true);
}

import { expect, type Page } from "@playwright/test";

const DEBUG_LOGIN_BUTTON = /Debug User|调试用户/i;

export async function signInAsDebugUser(
  page: Page,
  callbackPath = "/",
  expectedPath = callbackPath,
) {
  await page.goto(`/signin?callbackUrl=${encodeURIComponent(callbackPath)}`);
  await page.getByRole("button", { name: DEBUG_LOGIN_BUTTON }).first().click();

  const expectedPathPattern = expectedPath === "/" ? "\\/$" : expectedPath;
  await expect(page).toHaveURL(new RegExp(`${expectedPathPattern}(?:\\?.*)?$`));
  await expect(page.locator("#main-content")).toBeVisible();
}

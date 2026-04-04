/**
 * E2E tests for invalid tab fallback (`?tab=comments`)
 *
 * ## Data Represented
 * - There is no "comments" tab in the dashboard. Valid authenticated tabs are:
 *   overview, calendar, bus, homeworks, todos, exams, subscriptions, links.
 * - Valid public tabs are: links, bus.
 *
 * ## UI/UX Elements
 * - Public view: falls back to links tab content (search box, website links)
 * - Authenticated view: falls back to overview tab content
 *
 * ## Edge Cases
 * - `?tab=comments` is not a recognized tab value — the app silently falls
 *   back to the default tab without redirecting. The URL retains `?tab=comments`.
 */
import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { gotoAndWaitForReady } from "../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../utils/screenshot";

test.describe("dashboard invalid tab (comments)", () => {
  test("unauthenticated ?tab=comments falls back to public links view", async ({
    page,
  }, testInfo) => {
    await gotoAndWaitForReady(page, "/?tab=comments");

    // URL retains the invalid tab param
    await expect(page).toHaveURL(/\/\?tab=comments$/);
    await expect(page.locator("#app-logo")).toBeVisible();

    // Public view renders links content as default
    await expect(
      page.getByRole("link", { name: /^(网站|Websites)$/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^(登录|Sign in)$/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("searchbox", {
        name: /搜索网站名称或描述|Search by name or description/i,
      }),
    ).toBeVisible();

    await captureStepScreenshot(page, testInfo, "home-comments-public");
  });

  test("authenticated ?tab=comments falls back to overview", async ({
    page,
  }, testInfo) => {
    await signInAsDebugUser(page, "/?tab=comments");

    await expect(page.locator("#main-content")).toBeVisible();
    await expect(page.locator("#app-user-menu")).toBeVisible();

    // Overview is the fallback — should show the overview tab as active
    await expect(
      page.getByRole("link", { name: /^(总览|Overview)$/i }),
    ).toBeVisible();

    await captureStepScreenshot(page, testInfo, "home-comments-seed");
  });
});

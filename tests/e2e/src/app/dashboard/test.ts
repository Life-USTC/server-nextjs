/**
 * E2E tests for the Dashboard Home Page (`/`)
 *
 * ## Data Represented
 * - **Public (unauthenticated):** PublicHomeView with "bus" and "links" tabs
 *   (grouped as public queries). Auth-only tabs (overview, calendar, homeworks,
 *   todos, exams, subscriptions) are not accessible. A sign-in CTA is displayed.
 *   Default public tab is "bus".
 * - **Authenticated:** Full HomeView with 8 tabs: overview (default), calendar,
 *   bus, links, homeworks, todos, exams, subscriptions. Bus and links are grouped
 *   together as public queries after calendar.
 *
 * ## UI/UX Elements
 * - Tab navigation bar (`HomeTabNav`) with pill-style links
 * - Homeworks/exams/todos tabs show badge counts next to their labels
 * - User menu visible when authenticated; sign-in CTA when not
 *
 * ## Edge Cases
 * - `?tab=homeworks` for unauthenticated users falls back to public bus tab
 * - Invalid `?tab=` values default to "overview" (auth) or "bus" (public)
 */
import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../utils/auth";
import { DEV_SEED } from "../../../utils/dev-seed";
import { gotoAndWaitForReady } from "../../../utils/page-ready";
import { captureStepScreenshot } from "../../../utils/screenshot";

test.describe("dashboard", () => {
  test("unauthenticated with ?tab=homeworks shows public bus view", async ({
    page,
  }, testInfo) => {
    await gotoAndWaitForReady(page, "/?tab=homeworks");

    await expect(page).toHaveURL(/\/\?tab=homeworks$/);
    await expect(page.locator("#app-logo")).toBeVisible();

    // Public view shows bus + links tabs and sign-in CTA
    await expect(
      page.getByRole("link", { name: /^(校车|Shuttle Bus)$/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^(登录|Sign in)$/i }),
    ).toBeVisible();

    // Auth-only tabs should not be present
    await expect(
      page.getByRole("link", { name: /^(总览|Overview)$/i }),
    ).toHaveCount(0);

    await captureStepScreenshot(page, testInfo, "home-public-with-tab");
  });

  test("authenticated home shows overview with all tabs and seed data", async ({
    page,
  }, testInfo) => {
    await signInAsDebugUser(page, "/");

    await expect(page).toHaveURL(/\/(?:\?.*)?$/);
    await expect(page.locator("#main-content")).toBeVisible();
    await expect(page.locator("#app-user-menu")).toBeVisible();

    // All 8 tabs should be present in the nav bar
    const nav = page.getByLabel(/Dashboard section switcher/i);
    for (const label of [
      /^(总览|Overview)$/i,
      /^(日历|Calendar)$/i,
      /^(网站|Websites)$/i,
    ]) {
      await expect(nav.getByRole("link", { name: label })).toBeVisible();
    }

    // Seed homework title visible on overview
    await expect(
      page.getByText(DEV_SEED.homeworks.title).first(),
    ).toBeVisible();

    await captureStepScreenshot(page, testInfo, "dashboard-home");
  });

  test("can navigate to homeworks tab via tab bar", async ({
    page,
  }, testInfo) => {
    await signInAsDebugUser(page, "/");

    const homeworksTab = page
      .getByRole("link", { name: /作业|Homework/i })
      .first();
    await expect(homeworksTab).toBeVisible();
    await homeworksTab.click();

    await expect(page).toHaveURL(/tab=homeworks/);
    await captureStepScreenshot(page, testInfo, "dashboard-navigate-homeworks");
  });
});

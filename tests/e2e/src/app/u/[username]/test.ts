/**
 * E2E tests for the Public User Profile Page (`/u/[username]`)
 *
 * ## Data Represented
 * - Public profile looked up by **username** (case-insensitive, trimmed).
 * - Displays: avatar, display name, @username, join date, stats grid
 *   (sections, comments, uploads, homeworks), and a contribution heatmap
 *   covering the last 365 days.
 *
 * ## UI/UX Elements
 * - Left card: avatar, name, @username, join date, 4 stat counters
 * - Right card: contribution heatmap (weekly columns), legend (less → more),
 *   total contribution count in the title
 * - No authentication required — fully public page
 *
 * ## Edge Cases
 * - Non-existent username → 404 page with "Home" link
 * - Empty username param → 404
 * - User ID is **not** shown (that's `/u/id/[uid]`)
 */
import { expect, test } from "@playwright/test";
import { DEV_SEED } from "../../../../utils/dev-seed";
import { gotoAndWaitForReady } from "../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../utils/screenshot";
import { assertPageContract } from "../../_shared/page-contract";

test.describe("/u/[username]", () => {
  test("contract", async ({ page }, testInfo) => {
    await assertPageContract(page, { routePath: "/u/[username]", testInfo });
  });

  test("displays profile info and contribution chart", async ({
    page,
  }, testInfo) => {
    await gotoAndWaitForReady(page, `/u/${DEV_SEED.debugUsername}`);

    await expect(page.getByText(DEV_SEED.debugName).first()).toBeVisible();
    await expect(
      page.getByText(`@${DEV_SEED.debugUsername}`).first(),
    ).toBeVisible();

    // Stats grid should have numeric counters
    const statsGrid = page.locator(".grid.grid-cols-2");
    await expect(statsGrid).toBeVisible();

    // Contribution heatmap card
    await expect(page.getByText(/贡献|contribution/i).first()).toBeVisible();

    await captureStepScreenshot(page, testInfo, "u-username-profile");
  });

  test("returns 404 for non-existent username", async ({ page }, testInfo) => {
    await gotoAndWaitForReady(page, "/u/non-existing-username", {
      expectMainContent: false,
    });
    await expect(page.locator("h1")).toHaveText("404");
    await expect(
      page.getByRole("link", { name: /返回首页|Home/i }),
    ).toBeVisible();
    await captureStepScreenshot(page, testInfo, "u-username-404");
  });
});

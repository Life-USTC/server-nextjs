/**
 * E2E tests for the Public User Profile by ID Page (`/u/id/[uid]`)
 *
 * ## Data Represented
 * - Public profile looked up by **user ID** (UUID string).
 * - Same layout as `/u/[username]` but additionally shows the raw user ID.
 * - Displays: avatar, name, @username, join date, user ID, stats grid,
 *   contribution heatmap.
 *
 * ## UI/UX Elements
 * - Left card: avatar, name, @username, join date, **user ID label**,
 *   4 stat counters (sections, comments, uploads, homeworks)
 * - Right card: contribution heatmap with legend
 * - The `showUserId` prop is true, so the ID row is rendered
 *
 * ## Edge Cases
 * - Non-existent user ID → 404 page
 * - Empty uid param → 404
 * - Requires sign-in to discover a valid user ID (via session API)
 */
import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../../utils/auth";
import { DEV_SEED } from "../../../../../utils/dev-seed";
import { getCurrentSessionUser } from "../../../../../utils/e2e-db";
import { gotoAndWaitForReady } from "../../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../../utils/screenshot";
import { assertPageContract } from "../../../_shared/page-contract";

test.describe("/u/id/[uid]", () => {
  test("contract", async ({ page }, testInfo) => {
    await assertPageContract(page, { routePath: "/u/id/[uid]", testInfo });
  });

  test("displays profile with user ID visible", async ({ page }, testInfo) => {
    await signInAsDebugUser(page, "/");
    const user = await getCurrentSessionUser(page);

    await gotoAndWaitForReady(page, `/u/id/${user.id}`);

    await expect(
      page.getByText(`@${DEV_SEED.debugUsername}`).first(),
    ).toBeVisible();

    // User ID should be displayed (showUserId=true)
    await expect(page.getByText(user.id).first()).toBeVisible();

    // Contribution heatmap card
    await expect(page.getByText(/贡献|contribution/i).first()).toBeVisible();

    await captureStepScreenshot(page, testInfo, "u-id-uid-profile");
  });

  test("returns 404 for non-existent user ID", async ({ page }, testInfo) => {
    await gotoAndWaitForReady(page, "/u/id/non-existing-user-id", {
      expectMainContent: false,
    });
    await expect(page.locator("h1")).toHaveText("404");
    await captureStepScreenshot(page, testInfo, "u-id-uid-404");
  });
});

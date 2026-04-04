/**
 * E2E tests for the Settings Uploads Route (`/settings/uploads`)
 *
 * ## Data Represented
 * - This route is **deprecated/unused**. The page simply redirects to `/`.
 * - The settings layout still requires authentication before the redirect fires.
 *
 * ## UI/UX Elements
 * - None — the page performs an immediate server-side redirect.
 *
 * ## Edge Cases
 * - Unauthenticated → settings layout redirects to /signin
 * - Authenticated → page redirects to `/` (home)
 */
import { expect, test } from "@playwright/test";
import {
  expectRequiresSignIn,
  signInAsDebugUser,
} from "../../../../utils/auth";
import { captureStepScreenshot } from "../../../../utils/screenshot";

test.describe("/settings/uploads", () => {
  test("requires authentication", async ({ page }, testInfo) => {
    await expectRequiresSignIn(page, "/settings/uploads");
    await captureStepScreenshot(
      page,
      testInfo,
      "settings-uploads-unauthorized",
    );
  });

  test("redirects to home when authenticated", async ({ page }, testInfo) => {
    await signInAsDebugUser(page, "/settings/uploads", "/");

    await expect(page).toHaveURL(/\/(?:\?.*)?$/);
    await expect(page.locator("#main-content")).toBeVisible();
    await captureStepScreenshot(page, testInfo, "settings-uploads-redirect");
  });
});

/**
 * E2E tests for the Settings Content Tab (`/settings/content`)
 *
 * ## Data Represented
 * - `/settings/content` redirects to `/settings?tab=content`.
 * - Content section shows a link-card grid with two entries:
 *   - Uploads management (currently links to `/`)
 *   - Comments management (currently links to `/`)
 *
 * ## UI/UX Elements
 * - `PageLinkGrid` with 2-column layout containing `PageLinkCard` components
 * - Each card has: title, description, and navigates on click
 * - Uploads card: "我的上传" / "My uploads"
 * - Comments card: "我的评论" / "My comments"
 *
 * ## Edge Cases
 * - Unauthenticated → redirects to /signin
 * - Both cards currently link to `/` (feature placeholder)
 */
import { expect, test } from "@playwright/test";
import {
  expectPagePath,
  expectRequiresSignIn,
  signInAsDebugUser,
} from "../../../../utils/auth";
import { gotoAndWaitForReady } from "../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../utils/screenshot";

test.describe("/settings/content", () => {
  test("requires authentication", async ({ page }, testInfo) => {
    await expectRequiresSignIn(page, "/settings/content");
    await captureStepScreenshot(
      page,
      testInfo,
      "settings-content-unauthorized",
    );
  });

  test("displays content entry points", async ({ page }, testInfo) => {
    await signInAsDebugUser(page, "/settings/content");

    await expectPagePath(page, "/settings/content");
    const contentLinks = page.locator('#main-content .grid a[href="/"]');
    const uploadsLink = contentLinks.filter({
      has: page.getByText(/我的上传|My uploads/i),
    });
    const commentsLink = contentLinks.filter({
      has: page.getByText(/我的评论|My comments/i),
    });
    await expect(uploadsLink).toBeVisible();
    await expect(commentsLink).toBeVisible();
    await captureStepScreenshot(page, testInfo, "settings-content-links");
  });

  test("content links navigate correctly", async ({ page }, testInfo) => {
    await signInAsDebugUser(page, "/settings/content");

    // Click uploads link
    const uploadsLink = page
      .locator('#main-content .grid a[href="/"]')
      .filter({ has: page.getByText(/我的上传|My uploads/i) });
    await uploadsLink.click();
    await expect(page).toHaveURL(/\/(?:\?.*)?$/);
    await captureStepScreenshot(
      page,
      testInfo,
      "settings-content-navigate-uploads",
    );

    // Go back and click comments link
    await gotoAndWaitForReady(page, "/settings?tab=content");
    const commentsLink = page
      .locator('#main-content .grid a[href="/"]')
      .filter({ has: page.getByText(/我的评论|My comments/i) });
    await commentsLink.click();
    await expect(page).toHaveURL(/\/(?:\?.*)?$/);
    await captureStepScreenshot(
      page,
      testInfo,
      "settings-content-navigate-comments",
    );
  });
});

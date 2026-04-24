/**
 * E2E tests for the Settings Profile Tab (`/settings?tab=profile`)
 *
 * ## Data Represented
 * - `/settings?tab=profile` is the canonical profile settings entry.
 * - The profile section shows a form to edit: profile picture, name, username.
 * - Current values are pre-filled from the database.
 *
 * ## UI/UX Elements
 * - Profile picture selector (avatar + selectable thumbnails if available)
 * - Name input (`#name`) — free text
 * - Username input (`#username`) — validated with pattern `[a-z0-9-]{1,20}`
 * - Save button — submits via server action, shows success/error toast
 * - Card with title "Edit Profile" / "编辑资料"
 *
 * ## Edge Cases
 * - Unauthenticated → redirects to /signin
 * - Invalid username pattern → browser validation prevents submission
 * - Save success → toast with "Success" heading
 * - Name change persists across page reload
 */
import { expect, test } from "@playwright/test";
import {
  expectPagePath,
  expectRequiresSignIn,
  signInAsDebugUser,
} from "../../../../utils/auth";
import { DEV_SEED } from "../../../../utils/dev-seed";
import { withE2eLock } from "../../../../utils/locks";
import { captureStepScreenshot } from "../../../../utils/screenshot";

test.describe("/settings?tab=profile", () => {
  test("requires authentication", async ({ page }, testInfo) => {
    await expectRequiresSignIn(page, "/settings?tab=profile");
    await captureStepScreenshot(
      page,
      testInfo,
      "settings-profile-unauthorized",
    );
  });

  test("redirects and displays seed user data", async ({ page }, testInfo) => {
    await signInAsDebugUser(page, "/settings?tab=profile");

    await expectPagePath(page, "/settings?tab=profile");
    await expect(page.locator("input#name")).toHaveValue(DEV_SEED.debugName);
    await expect(page.locator("input#username")).toHaveValue(
      DEV_SEED.debugUsername,
    );
    await captureStepScreenshot(page, testInfo, "settings-profile-seed");
  });

  test("can save name and rollback", async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await withE2eLock("debug-user-profile", async () => {
      await signInAsDebugUser(page, "/settings?tab=profile");

      const nameInput = page.locator("input#name");
      const saveButton = page.getByRole("button", { name: /保存|Save/i });
      const successToast = page.getByRole("heading", {
        name: /成功|Success/i,
      });
      const originalName = await nameInput.inputValue();
      const newName = `e2e-${Date.now()}`;

      await nameInput.fill(newName);
      await saveButton.click();
      await expect(successToast).toBeVisible();
      await page.waitForLoadState("networkidle");
      await page.reload();
      await expect(page.locator("input#name")).toHaveValue(newName);
      await captureStepScreenshot(page, testInfo, "settings-profile-saved");

      await page.locator("input#name").fill(originalName);
      await saveButton.click();
      await expect(successToast).toBeVisible();
      await page.waitForLoadState("networkidle");
      await page.reload();
      await expect(page.locator("input#name")).toHaveValue(originalName);
    });
  });
});

import { expect, test } from "@playwright/test";
import { expectRequiresSignIn, signInAsDebugUser } from "../../../utils/auth";
import { DEV_SEED } from "../../../utils/dev-seed";
import {
  getCurrentSessionUser,
  getUserProfileById,
  updateUserProfileById,
} from "../../../utils/e2e-db";
import { withE2eLock } from "../../../utils/locks";
import { gotoAndWaitForReady } from "../../../utils/page-ready";
import { captureStepScreenshot } from "../../../utils/screenshot";

test("/welcome 未登录重定向到登录页", async ({ page }, testInfo) => {
  await expectRequiresSignIn(page, "/welcome");
  await captureStepScreenshot(page, testInfo, "welcome-unauthorized");
});

test("/welcome 未完善资料的用户可完成资料并返回首页", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  await withE2eLock("debug-user-profile", async () => {
    await signInAsDebugUser(page, "/");

    const sessionUser = await getCurrentSessionUser(page);
    const originalUser = getUserProfileById(sessionUser.id);

    updateUserProfileById(sessionUser.id, {
      name: null,
      username: null,
    });

    try {
      await gotoAndWaitForReady(page, "/welcome");

      await expect(page).toHaveURL(/\/welcome(?:\?.*)?$/);
      await page
        .getByRole("textbox", { name: /^(姓名|Name)\b/i })
        .fill(DEV_SEED.debugName);
      await page
        .getByRole("textbox", { name: /^(用户名|Username)\b/i })
        .fill(DEV_SEED.debugUsername);

      await page.getByRole("button", { name: /继续|Continue/i }).click();

      await expect(page).toHaveURL(/\/(?:\?.*)?$/, {
        timeout: 15000,
      });
      await expect(page.locator("#main-content")).toBeVisible();

      const updatedUser = getUserProfileById(sessionUser.id);
      expect(updatedUser.name).toBe(DEV_SEED.debugName);
      expect(updatedUser.username).toBe(DEV_SEED.debugUsername);
      await captureStepScreenshot(page, testInfo, "welcome-completed");
    } finally {
      updateUserProfileById(sessionUser.id, {
        name: originalUser.name ?? DEV_SEED.debugName,
        username: originalUser.username ?? DEV_SEED.debugUsername,
        image: originalUser.image ?? null,
      });
    }
  });
});

test("/welcome 提供浏览班级与批量匹配入口", async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await withE2eLock("debug-user-profile", async () => {
    await signInAsDebugUser(page, "/");

    const sessionUser = await getCurrentSessionUser(page);
    const originalUser = getUserProfileById(sessionUser.id);

    updateUserProfileById(sessionUser.id, {
      name: null,
      username: null,
    });

    try {
      await gotoAndWaitForReady(page, "/welcome");

      await expect(
        page.getByRole("link", { name: /浏览班级|Browse Sections/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /浏览课程|Browse Courses/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", {
          name: /批量导入班级|Bulk Import Sections/i,
        }),
      ).toBeVisible();

      await captureStepScreenshot(page, testInfo, "welcome-next-steps");
    } finally {
      updateUserProfileById(sessionUser.id, {
        name: originalUser.name ?? DEV_SEED.debugName,
        username: originalUser.username ?? DEV_SEED.debugUsername,
        image: originalUser.image ?? null,
      });
    }
  });
});

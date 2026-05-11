/**
 * E2E tests for /signin
 *
 * ## Data Represented (user.yml → sign-in.display.fields)
 * - OAuth provider buttons: GitHub, Google, OIDC/USTC
 * - Error message (if login fails)
 * - Terms and privacy links
 *
 * ## Features
 * - Provider buttons initiate OAuth flows
 * - Debug login button (dev-only) bypasses OAuth
 * - After login: redirected to callbackUrl or home
 *
 * ## Edge Cases
 * - Already authenticated user navigating to /signin redirects away
 * - jwId is NOT displayed
 */
import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../utils/auth";
import { gotoAndWaitForReady } from "../../../utils/page-ready";
import { captureStepScreenshot } from "../../../utils/screenshot";
import { assertPageContract } from "../_shared/page-contract";

test("/signin contract", async ({ page }, testInfo) => {
  await assertPageContract(page, { routePath: "/signin", testInfo });
});

test("/signin displays all required fields", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/signin", {
    testInfo,
    screenshotLabel: "signin",
  });

  // OAuth provider buttons (user.yml sign-in.display.fields)
  await expect(
    page.getByRole("button", { name: /USTC/i }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /GitHub/i }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Google/i }).first(),
  ).toBeVisible();

  // Terms and privacy links
  await expect(
    page.getByRole("link", { name: /服务条款|Terms/i }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /隐私政策|Privacy/i }).first(),
  ).toBeVisible();

  await captureStepScreenshot(page, testInfo, "signin/all-fields");
});

test("/signin 调试用户按钮可登录", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/signin", {
    testInfo,
    screenshotLabel: "signin",
  });

  await captureStepScreenshot(page, testInfo, "signin/initial");

  await signInAsDebugUser(page, "/", "/", { ui: true });
  await expect(page).toHaveURL(/\/(?:\?.*)?$/);
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(page.locator("#app-logo")).toBeVisible();
  await expect(page.locator("#app-user-menu")).toBeVisible();
  await captureStepScreenshot(page, testInfo, "signin/after-login");
});

test("/signin post-login redirects to callbackUrl", async ({
  page,
}, testInfo) => {
  // callbackUrl preserved through the sign-in flow (user.yml post-login-redirect)
  await gotoAndWaitForReady(page, "/signin?callbackUrl=%2Fsections", {
    testInfo,
    screenshotLabel: "signin-callback",
  });
  await signInAsDebugUser(page, "/sections", "/sections", { ui: true });
  await expect(page).toHaveURL(/\/sections(?:\?.*)?$/);
  await captureStepScreenshot(page, testInfo, "signin/post-login-redirect");
});

import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { gotoAndWaitForReady } from "../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../utils/screenshot";

test("/ 未登录访问首页时显示公开内容", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/", {
    expectMainContent: false,
  });

  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("#app-logo")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /^(网站|Websites)$/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /^(登录|Sign in)$/i }),
  ).toBeVisible();
  await captureStepScreenshot(page, testInfo, "home-comments-public");
});

test("/ 登录后展示首页评论入口", async ({ page }, testInfo) => {
  await signInAsDebugUser(page, "/");

  await expect(page).toHaveURL(/\/(?:\?.*)?$/);
  await expect(page.locator("#main-content")).toBeVisible();
  await captureStepScreenshot(page, testInfo, "home-comments-seed");
});

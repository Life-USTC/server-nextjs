import { expect, test } from "@playwright/test";
import { gotoAndWaitForReady } from "../../utils/page-ready";
import { captureStepScreenshot } from "../../utils/screenshot";
import { assertPageContract } from "./_shared/page-contract";

test("/", async ({ page }, testInfo) => {
  await assertPageContract(page, { routePath: "/", testInfo });
});

test("/ 首页快速入口可见", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/");

  await expect(page.locator('a[href="/sections"]').first()).toBeVisible();
  await expect(page.locator('a[href="/teachers"]').first()).toBeVisible();
  await expect(page.locator('a[href="/dashboard"]').first()).toBeVisible();
  await captureStepScreenshot(page, testInfo, "home-shortcuts");
});

test("/ 主题切换可写入 localStorage", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/");

  const themeButton = page.getByRole("button", {
    name: /切换到浅色模式|切换到深色模式|使用系统偏好|Switch to light mode|Switch to dark mode|Use system preference/i,
  });
  await expect(themeButton).toBeVisible();

  await themeButton.click();
  await expect
    .poll(async () =>
      page.evaluate(() => localStorage.getItem("life-ustc-theme")),
    )
    .toBe("light");
  await captureStepScreenshot(page, testInfo, "theme-light");

  await themeButton.click();
  await expect
    .poll(async () =>
      page.evaluate(() => localStorage.getItem("life-ustc-theme")),
    )
    .toBe("dark");
  await captureStepScreenshot(page, testInfo, "theme-dark");
});

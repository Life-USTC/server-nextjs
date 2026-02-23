import { expect, type Page, test } from "@playwright/test";
import { captureStepScreenshot } from "./utils/screenshot";

async function setLocale(page: Page, locale: "en-us" | "zh-cn") {
  const response = await page.request.post("/api/locale", {
    data: { locale },
  });
  expect(response.status()).toBe(200);
}

test.describe("语言与主题偏好切换", () => {
  test("语言切换按钮可从中文切换到英文", async ({ page }, testInfo) => {
    await setLocale(page, "zh-cn");
    await page.goto("/courses");
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-cn");
    await expect(
      page.getByRole("heading", { name: /所有课程|All Courses/i }),
    ).toBeVisible();
    await captureStepScreenshot(page, testInfo, "locale-zh-cn-initial");

    await page
      .getByRole("button", {
        name: /语言选择|Language selector/i,
      })
      .click();
    await page
      .getByRole("menuitemradio", { name: /English/i })
      .first()
      .click();

    await expect(page.locator("html")).toHaveAttribute("lang", "en-us");
    await expect(
      page.getByRole("heading", { name: /All Courses|所有课程/i }),
    ).toBeVisible();
    await captureStepScreenshot(page, testInfo, "locale-switched-to-en-us");
  });

  test("语言切换按钮可从英文切换到中文", async ({ page }, testInfo) => {
    await setLocale(page, "en-us");
    await page.goto("/courses");
    await expect(page.locator("html")).toHaveAttribute("lang", "en-us");
    await expect(
      page.getByRole("heading", { name: /All Courses|所有课程/i }),
    ).toBeVisible();
    await captureStepScreenshot(page, testInfo, "locale-en-us-initial");

    await page
      .getByRole("button", {
        name: /语言选择|Language selector/i,
      })
      .click();
    await page
      .getByRole("menuitemradio", { name: /中文|Chinese/i })
      .first()
      .click();

    await expect(page.locator("html")).toHaveAttribute("lang", "zh-cn");
    await expect(
      page.getByRole("heading", { name: /所有课程|All Courses/i }),
    ).toBeVisible();
    await captureStepScreenshot(page, testInfo, "locale-switched-to-zh-cn");
  });

  test("Dark Mode 按钮可循环切换 light/dark/system", async ({
    page,
  }, testInfo) => {
    await page.goto("/");

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
    await expect(page.locator("html")).toHaveClass(/dark/);
    await captureStepScreenshot(page, testInfo, "theme-dark");

    await themeButton.click();
    await expect
      .poll(async () =>
        page.evaluate(() => localStorage.getItem("life-ustc-theme")),
      )
      .toBe("system");
    await captureStepScreenshot(page, testInfo, "theme-system");
  });
});

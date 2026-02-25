import { expect, test } from "@playwright/test";
import { DEV_SEED } from "../../../utils/dev-seed";
import { gotoAndWaitForReady } from "../../../utils/page-ready";
import { captureStepScreenshot } from "../../../utils/screenshot";
import { assertPageContract } from "../_shared/page-contract";

test("/courses", async ({ page }, testInfo) => {
  await assertPageContract(page, { routePath: "/courses", testInfo });
});

test("/courses SSR 输出包含查询参数", async ({ request }) => {
  const response = await request.get(
    `/courses?search=${encodeURIComponent(DEV_SEED.course.code)}`,
  );
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('id="main-content"');
  expect(html).toContain(DEV_SEED.course.code);
});

test("/courses 语言切换可生效", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/courses");

  const localeResponse = await page.request.post("/api/locale", {
    data: { locale: "en-us" },
  });
  expect(localeResponse.status()).toBe(200);

  await gotoAndWaitForReady(page, "/courses");
  await expect(page.locator("html")).toHaveAttribute("lang", "en-us");
  await captureStepScreenshot(page, testInfo, "courses-en-us");

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
  await captureStepScreenshot(page, testInfo, "courses-zh-cn");
});

test("/courses 可从列表点击进入详情", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(
    page,
    `/courses?search=${encodeURIComponent(DEV_SEED.course.code)}`,
  );
  const detailLink = page.locator("tbody a[href^='/courses/']").first();
  await expect(detailLink).toBeVisible();
  await detailLink.click();
  await expect(page).toHaveURL(new RegExp(`/courses/${DEV_SEED.course.jwId}`));
  await captureStepScreenshot(page, testInfo, "courses-navigate-detail");
});

test("/courses 搜索与清除按钮可用", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/courses");

  const searchbox = page.getByRole("searchbox").first();
  if ((await searchbox.count()) === 0) {
    await expect(page.locator("#main-content")).toBeVisible();
    return;
  }

  await searchbox.fill(DEV_SEED.course.code);
  const searchButton = page
    .getByRole("button", { name: /搜索|Search/i })
    .first();
  if ((await searchButton.count()) > 0) {
    await searchButton.click();
  }

  await expect(page).toHaveURL(/search=/);

  const clearButton = page.getByRole("button", { name: /清除|Clear/i }).first();
  if ((await clearButton.count()) > 0) {
    await clearButton.click();
    await expect(page).not.toHaveURL(/search=/);
  }

  await captureStepScreenshot(page, testInfo, "courses-search-clear");
});

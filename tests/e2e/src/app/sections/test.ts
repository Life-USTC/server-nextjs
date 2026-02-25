import { expect, test } from "@playwright/test";
import { DEV_SEED } from "../../../utils/dev-seed";
import { gotoAndWaitForReady } from "../../../utils/page-ready";
import { captureStepScreenshot } from "../../../utils/screenshot";
import { assertPageContract } from "../_shared/page-contract";

test("/sections", async ({ page }, testInfo) => {
  await assertPageContract(page, { routePath: "/sections", testInfo });
});

test("/sections SSR 输出包含查询参数", async ({ request }) => {
  const response = await request.get(
    `/sections?search=${encodeURIComponent(DEV_SEED.section.code)}`,
  );
  expect(response.status()).toBe(200);
  const html = await response.text();

  expect(html).toContain('id="main-content"');
  expect(html).toContain(DEV_SEED.section.code);
});

test("/sections 可从列表进入详情", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(
    page,
    `/sections?search=${encodeURIComponent(DEV_SEED.section.code)}`,
  );

  const detailLink = page.locator("tbody a[href^='/sections/']").first();
  await expect(detailLink).toBeVisible();
  await detailLink.click();

  await expect(page).toHaveURL(/\/sections\/\d+(?:\?.*)?$/);
  await expect(page.locator("#main-content")).toBeVisible();
  await captureStepScreenshot(page, testInfo, "sections-navigate-detail");
});

test("/sections 搜索帮助与清除筛选可用", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/sections");

  await page
    .getByRole("button", { name: /\?|帮助|Help/i })
    .first()
    .click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await captureStepScreenshot(page, testInfo, "sections-search-help");
  await sheet
    .getByRole("button", { name: /关闭|Close|Cancel/i })
    .first()
    .click();

  const searchInput = page.getByPlaceholder(/搜索或使用高级语法|search/i);
  await searchInput.fill(DEV_SEED.section.code);
  await page.getByRole("button", { name: /搜索|Search/i }).click();
  await expect(page).toHaveURL(
    new RegExp(`search=${encodeURIComponent(DEV_SEED.section.code)}`),
  );
  await expect(page.getByText(DEV_SEED.section.code).first()).toBeVisible();
  await captureStepScreenshot(page, testInfo, "sections-search-results");

  const clearLink = page.getByRole("link", { name: /清除|Clear/i }).first();
  if ((await clearLink.count()) > 0) {
    await clearLink.click();
    await expect(page).toHaveURL(/\/sections(?:\?.*)?$/);
    await captureStepScreenshot(page, testInfo, "sections-clear");
  }
});

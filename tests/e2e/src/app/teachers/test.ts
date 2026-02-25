import { expect, test } from "@playwright/test";
import { DEV_SEED } from "../../../utils/dev-seed";
import { gotoAndWaitForReady } from "../../../utils/page-ready";
import { captureStepScreenshot } from "../../../utils/screenshot";
import { assertPageContract } from "../_shared/page-contract";

test("/teachers", async ({ page }, testInfo) => {
  await assertPageContract(page, { routePath: "/teachers", testInfo });
});

test("/teachers SSR 输出包含查询参数", async ({ request }) => {
  const response = await request.get(
    `/teachers?search=${encodeURIComponent(DEV_SEED.teacher.nameCn)}`,
  );
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('id="main-content"');
  expect(html).toContain(DEV_SEED.teacher.nameCn);
});

test("/teachers 可从列表进入详情", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(
    page,
    `/teachers?search=${encodeURIComponent(DEV_SEED.teacher.nameCn)}`,
  );

  const detailLink = page.locator("tbody a[href^='/teachers/']").first();
  await expect(detailLink).toBeVisible();
  await detailLink.click();

  await expect(page).toHaveURL(/\/teachers\/\d+(?:\?.*)?$/);
  await expect(page.locator("#main-content")).toBeVisible();
  await captureStepScreenshot(page, testInfo, "teachers-navigate-detail");
});

test("/teachers 搜索与清除按钮可用", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/teachers");

  const searchbox = page.getByRole("searchbox").first();
  if ((await searchbox.count()) === 0) {
    await expect(page.locator("#main-content")).toBeVisible();
    return;
  }

  await searchbox.fill(DEV_SEED.teacher.nameCn);
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

  await captureStepScreenshot(page, testInfo, "teachers-search-clear");
});

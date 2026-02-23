import { expect, type Page, test } from "@playwright/test";

async function expectTableOrEmpty(page: Page) {
  const table = page.locator("table");
  if ((await table.count()) > 0) {
    await expect(table.first()).toBeVisible();
    return;
  }

  await expect(page.locator('[data-slot="empty"]').first()).toBeVisible();
}

function visibleSearchInput(page: Page) {
  return page.locator('input[name="search"]:visible').first();
}

test("sections 页面可访问并支持搜索参数", async ({ page }) => {
  await page.goto("/sections");
  const searchInput = visibleSearchInput(page);

  await expect(page).toHaveURL(/\/sections(?:\?.*)?$/);
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(searchInput).toBeVisible();
  await expectTableOrEmpty(page);

  await searchInput.fill("playwright");
  await searchInput.press("Enter");

  await expect(page).toHaveURL(/\/sections\?.*search=playwright/);
  await expect(searchInput).toHaveValue("playwright");
});

test("teachers 页面可访问并支持搜索参数", async ({ page }) => {
  await page.goto("/teachers");
  const searchInput = visibleSearchInput(page);

  await expect(page).toHaveURL(/\/teachers(?:\?.*)?$/);
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(searchInput).toBeVisible();
  await expectTableOrEmpty(page);

  await searchInput.fill("playwright");
  await searchInput.press("Enter");

  await expect(page).toHaveURL(/\/teachers\?.*search=playwright/);
  await expect(searchInput).toHaveValue("playwright");
});

test("courses 页面可访问并支持搜索参数", async ({ page }) => {
  await page.goto("/courses");
  const searchInput = visibleSearchInput(page);

  await expect(page).toHaveURL(/\/courses(?:\?.*)?$/);
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(searchInput).toBeVisible();
  await expectTableOrEmpty(page);

  await searchInput.fill("playwright");
  await searchInput.press("Enter");

  await expect(page).toHaveURL(/\/courses\?.*search=playwright/);
  await expect(searchInput).toHaveValue("playwright");
});

test("评论指南页面可访问并渲染 Markdown 示例", async ({ page }) => {
  await page.goto("/comments/guide");

  await expect(page).toHaveURL(/\/comments\/guide$/);
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(page.locator("pre").first()).toBeVisible();
  await expect(page.locator("table").first()).toBeVisible();
});

test("API 文档页面可访问并展示容器", async ({ page }) => {
  await page.goto("/api-docs");

  await expect(page).toHaveURL(/\/api-docs$/);
  await expect(page.locator("#swagger-ui")).toBeVisible();
});

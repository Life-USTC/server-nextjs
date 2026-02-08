import { expect, type Page, test } from "@playwright/test";

async function expectNotFoundPage(page: Page) {
  await expect(page.locator("h1")).toHaveText("404");
}

async function verifyListToDetailNavigation(
  page: Page,
  listPath: string,
  detailPrefix: string,
  fallbackDetailPath: string,
) {
  await page.goto(listPath);
  await expect(page).toHaveURL(
    new RegExp(`${listPath.replace("/", "\\/")}(?:\\?.*)?$`),
  );
  await expect(page.locator("#main-content")).toBeVisible();

  const detailLink = page.locator(`tbody a[href^="${detailPrefix}"]`).first();
  if ((await detailLink.count()) > 0) {
    const href = await detailLink.getAttribute("href");
    await detailLink.click();
    if (new URL(page.url()).pathname === listPath && href) {
      await page.goto(href);
    }
    await expect(page).toHaveURL(
      new RegExp(`${detailPrefix.replace("/", "\\/")}\\d+`),
    );
    await expect(page.locator("#main-content")).toBeVisible();
    return;
  }

  await expect(page.locator('[data-slot="empty"]').first()).toBeVisible();
  await page.goto(fallbackDetailPath);
  await expectNotFoundPage(page);
}

test("sections 列表可进入详情（或在空数据时返回 404）", async ({ page }) => {
  await verifyListToDetailNavigation(
    page,
    "/sections",
    "/sections/",
    "/sections/999999999",
  );
});

test("teachers 列表可进入详情（或在空数据时返回 404）", async ({ page }) => {
  await verifyListToDetailNavigation(
    page,
    "/teachers",
    "/teachers/",
    "/teachers/999999999",
  );
});

test("courses 列表可进入详情（或在空数据时返回 404）", async ({ page }) => {
  await verifyListToDetailNavigation(
    page,
    "/courses",
    "/courses/",
    "/courses/999999999",
  );
});

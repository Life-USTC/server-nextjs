/**
 * E2E tests for /sections — Advanced Section Search
 *
 * ## Data Represented
 * - Sections with course, semester, teachers, credits, campus, capacity
 * - Seed section: DEV-CS201.01 (jwId 9902001) for course "软件工程实践"
 *
 * ## UI/UX Elements
 * - Search input with advanced syntax (teacher:, coursecode:, campus:, credits:, etc.)
 * - Search help dialog (?) explaining syntax
 * - Semester filter dropdown (combobox)
 * - Table: Semester, Course Name, Section Code, Teachers, Credits, Capacity, Campus
 * - Clickable rows navigating to /sections/{jwId}
 * - Pagination controls when totalPages > 1
 * - DataState empty state when no results
 * - Clear filter link
 * - Breadcrumbs: Home > Sections
 *
 * ## Edge Cases
 * - SSR output contains search query for SEO
 * - Semester filter updates URL with semesterId param
 * - Advanced search syntax parsed server-side (sort:, order:asc/desc)
 */
import { expect, test } from "@playwright/test";
import { DEV_SEED } from "../../../utils/dev-seed";
import { getSeedSectionSemesterFixture } from "../../../utils/e2e-db";
import { gotoAndWaitForReady } from "../../../utils/page-ready";
import { captureStepScreenshot } from "../../../utils/screenshot";
import { assertPageContract } from "../_shared/page-contract";

test.describe("/sections", () => {
  test("contract", async ({ page }, testInfo) => {
    await assertPageContract(page, { routePath: "/sections", testInfo });
  });

  test("SSR output contains search query", async ({ request }) => {
    const response = await request.get(
      `/sections?search=${encodeURIComponent(DEV_SEED.section.code)}`,
    );
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain('id="main-content"');
    expect(html).toContain(DEV_SEED.section.code);
  });

  test("can navigate from list to detail", async ({ page }, testInfo) => {
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

  test("search help and clear", async ({ page }, testInfo) => {
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
    await expect(page.getByText(DEV_SEED.course.nameEn).first()).toBeVisible();
    await expect(page.getByText(DEV_SEED.section.code).first()).toBeVisible();
    await captureStepScreenshot(page, testInfo, "sections-search-results");

    const clearLink = page.getByRole("link", { name: /清除|Clear/i }).first();
    if ((await clearLink.count()) > 0) {
      await clearLink.click();
      await expect(page).toHaveURL(/\/sections(?:\?.*)?$/);
      await captureStepScreenshot(page, testInfo, "sections-clear");
    }
  });

  test("semester filter preserves seed results", async ({ page }, testInfo) => {
    const filter = getSeedSectionSemesterFixture(DEV_SEED.section.jwId);
    await gotoAndWaitForReady(page, "/sections");

    if (!filter.semesterName) {
      await expect(page.locator("#main-content")).toBeVisible();
      return;
    }

    await page.getByRole("combobox").first().click();
    await page
      .getByRole("option", { name: new RegExp(filter.semesterName) })
      .first()
      .click();

    await expect(page).toHaveURL(new RegExp(`semesterId=${filter.semesterId}`));
    await expect(page.getByText(DEV_SEED.course.nameEn).first()).toBeVisible();
    await expect(page.getByText(DEV_SEED.section.code).first()).toBeVisible();
    await captureStepScreenshot(page, testInfo, "sections-filter-semester");
  });
});

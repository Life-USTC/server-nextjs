import { expect, type Page, test } from "@playwright/test";
import { captureStepScreenshot } from "./utils/screenshot";

const SEED_SECTION_JW_ID = 9_902_001;
const SEED_COURSE_JW_ID = 9_901_001;

function visibleSearchInput(page: Page) {
  return page.locator('input[name="search"]:visible').first();
}

test.describe("Fake Data 查询与详情页", () => {
  test("sections 可查询到 seeded section 并跳转详情", async ({
    page,
  }, testInfo) => {
    await page.goto("/sections");
    const searchInput = visibleSearchInput(page);
    await expect(searchInput).toBeVisible();

    await searchInput.fill("DEV-CS201.01");
    await searchInput.press("Enter");

    await expect(page).toHaveURL(/\/sections\?.*search=DEV-CS201\.01/);
    const targetLink = page.locator(
      `a[href="/sections/${SEED_SECTION_JW_ID}"]`,
    );
    await expect(targetLink.first()).toBeVisible();
    await expect(page.getByText("DEV-CS201.01").first()).toBeVisible();
    await captureStepScreenshot(page, testInfo, "sections-search-result");

    await targetLink.first().click();
    await expect(page).toHaveURL(
      new RegExp(`/sections/${SEED_SECTION_JW_ID}(?:\\?.*)?(#.*)?$`),
    );
    await expect(page.locator("#main-content")).toBeVisible();
    await expect(page.getByText("DEV-CS201.01").first()).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /日历|Calendar/i }),
    ).toBeVisible();
    await captureStepScreenshot(page, testInfo, "section-detail-page");
  });

  test("courses 可查询到 seeded course 并跳转详情", async ({
    page,
  }, testInfo) => {
    await page.goto("/courses");
    const searchInput = visibleSearchInput(page);
    await expect(searchInput).toBeVisible();

    await searchInput.fill("DEV-CS201");
    await searchInput.press("Enter");

    await expect(page).toHaveURL(/\/courses\?.*search=DEV-CS201/);
    const targetLink = page.locator(`a[href="/courses/${SEED_COURSE_JW_ID}"]`);
    await expect(targetLink.first()).toBeVisible();
    await expect(page.getByText("DEV-CS201").first()).toBeVisible();
    await captureStepScreenshot(page, testInfo, "courses-search-result");

    await targetLink.first().click();
    await expect(page).toHaveURL(/\/courses\/9901001(?:\?.*)?$/);
    await expect(page.locator("#main-content")).toBeVisible();
    await expect(page.getByText("DEV-CS201").first()).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /班级|Sections/i }),
    ).toBeVisible();
    await expect(
      page.locator(`a[href="/sections/${SEED_SECTION_JW_ID}"]`).first(),
    ).toBeVisible();
    await captureStepScreenshot(page, testInfo, "course-detail-page");
  });

  test("teachers 可查询到 seeded teacher 并跳转详情", async ({
    page,
  }, testInfo) => {
    await page.goto("/teachers");
    const searchInput = visibleSearchInput(page);
    await expect(searchInput).toBeVisible();

    await searchInput.fill("王测试");
    await searchInput.press("Enter");

    await expect(page).toHaveURL(
      /\/teachers\?.*search=%E7%8E%8B%E6%B5%8B%E8%AF%95/,
    );
    const teacherLink = page.locator('tbody a[href^="/teachers/"]').first();
    await expect(teacherLink).toBeVisible();
    await captureStepScreenshot(page, testInfo, "teachers-search-result");

    const href = await teacherLink.getAttribute("href");
    expect(href).toMatch(/^\/teachers\/\d+$/);
    await teacherLink.click();

    await expect(page).toHaveURL(/\/teachers\/\d+(?:\?.*)?$/);
    await expect(page.locator("#main-content")).toBeVisible();
    await expect(page.getByRole("heading", { name: "王测试" })).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /评论|Comments/i }),
    ).toBeVisible();
    await expect(page.getByText("DEV-CS201.01").first()).toBeVisible();
    await captureStepScreenshot(page, testInfo, "teacher-detail-page");
  });

  test("section/course/teacher 详情页关键布局元素存在", async ({ page }) => {
    await page.goto(`/sections/${SEED_SECTION_JW_ID}`);
    await expect(page.locator("#main-content")).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /日历|Calendar/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /作业|Homework/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /评论|Comments/i }),
    ).toBeVisible();

    await page.goto(`/courses/${SEED_COURSE_JW_ID}`);
    await expect(page.locator("#main-content")).toBeVisible();
    await expect(page.locator("table").first()).toBeVisible();
    await expect(
      page.locator(`a[href="/sections/${SEED_SECTION_JW_ID}"]`).first(),
    ).toBeVisible();

    const teacherIdResp = await page.request.get(
      "/api/teachers?search=%E7%8E%8B%E6%B5%8B%E8%AF%95&limit=1",
    );
    expect(teacherIdResp.status()).toBe(200);
    const teacherBody = (await teacherIdResp.json()) as {
      data?: Array<{ id?: number }>;
    };
    const teacherId = teacherBody.data?.find(
      (entry) => typeof entry.id === "number",
    )?.id;
    expect(typeof teacherId).toBe("number");

    await page.goto(`/teachers/${teacherId}`);
    await expect(page.locator("#main-content")).toBeVisible();
    await expect(page).toHaveURL(
      new RegExp(`/teachers/${teacherId}(?:\\?.*)?$`),
    );
    await expect(page.locator("table").first()).toBeVisible();
  });
});

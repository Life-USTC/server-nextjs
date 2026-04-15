/**
 * E2E tests for `/courses/[jwId]` — Individual Course Detail page.
 *
 * ## Seed data (DEV_SEED)
 *   - course.jwId = 9901001, code = "DEV-CS201", nameCn = "软件工程实践"
 *   - section.code = "DEV-CS201.01"
 *
 * ## UI / UX contract
 *   - Breadcrumbs: Home > Courses > {course.code}
 *   - h1: course name (primary + secondary)
 *   - Tabs: "sections" (default), "comments" (with count badge)
 *   - Sections tab: table with Semester, Section Code (Badge), Teachers,
 *     Campus, Capacity (stdCount/limitCount Badge)
 *   - Comments tab: Suspense-loaded CommentsSection (CourseCommentsLoader)
 *   - Sidebar: Description panel (editable by signed-in users),
 *     Basic Info card (code, level, category, type)
 *
 * ## Edge cases
 *   - Invalid jwId → notFound() → 404 page
 *   - Description edit requires authentication and waits for POST response
 *   - Comment CRUD: post → edit → delete, each waiting for API confirmation
 */
import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { DEV_SEED } from "../../../../utils/dev-seed";
import { gotoAndWaitForReady } from "../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../utils/screenshot";
import { assertPageContract } from "../../_shared/page-contract";

test.describe("/courses/[jwId]", () => {
  test("contract", async ({ page }, testInfo) => {
    await assertPageContract(page, { routePath: "/courses/[jwId]", testInfo });
  });

  test("404 for invalid param", async ({ page }, testInfo) => {
    await gotoAndWaitForReady(page, "/courses/999999999", {
      expectMainContent: false,
    });
    await expect(page.locator("h1")).toHaveText("404");
    await captureStepScreenshot(page, testInfo, "courses-jwId-404");
  });

  test("tab switching", async ({ page }, testInfo) => {
    await gotoAndWaitForReady(page, `/courses/${DEV_SEED.course.jwId}`);

    const nextTab = page.locator('[role="tab"][aria-selected="false"]').first();
    if ((await nextTab.count()) > 0) {
      const tabId = await nextTab.getAttribute("id");
      await nextTab.click();
      expect(tabId).toBeTruthy();
      await expect(page.locator(`[role="tab"]#${tabId}`)).toHaveAttribute(
        "aria-selected",
        "true",
      );
      await captureStepScreenshot(page, testInfo, "courses-jwId-tab");
    }
  });

  test("课程编号显示在面包屑和基本信息中", async ({ page }, testInfo) => {
    await gotoAndWaitForReady(page, `/courses/${DEV_SEED.course.jwId}`);
    await expect(page.getByText(DEV_SEED.course.code).first()).toBeVisible();
    await expect(page.getByText(DEV_SEED.course.nameEn).first()).toBeVisible();
    await captureStepScreenshot(page, testInfo, "courses-jwId-code-and-en");
  });

  test("班级列表显示教师名称", async ({ page }, testInfo) => {
    await gotoAndWaitForReady(page, `/courses/${DEV_SEED.course.jwId}`);
    await expect(page.getByText(DEV_SEED.section.code).first()).toBeVisible();
    await expect(page.getByText(DEV_SEED.teacher.nameCn).first()).toBeVisible();
    await captureStepScreenshot(page, testInfo, "courses-jwId-sections-table");
  });

  test("breadcrumb navigates back", async ({ page }, testInfo) => {
    await gotoAndWaitForReady(page, `/courses/${DEV_SEED.course.jwId}`);
    const breadcrumb = page.locator('a[href="/courses"]').first();
    await expect(breadcrumb).toBeVisible();
    await breadcrumb.click();
    await expect(page).toHaveURL(/\/courses(?:\?.*)?$/);
    await captureStepScreenshot(page, testInfo, "courses-jwId-breadcrumb");
  });

  test("signed-in user can edit description", async ({ page }, testInfo) => {
    test.setTimeout(60000);
    await signInAsDebugUser(page, `/courses/${DEV_SEED.course.jwId}`);

    const descCard = page
      .locator('[data-slot="card"]')
      .filter({ has: page.getByText(/简介|Description/i) })
      .first();
    await expect(descCard).toBeVisible();

    await descCard.getByRole("button", { name: /^编辑$|^Edit$/i }).click();
    const content = `e2e-course-desc-${Date.now()}`;
    await descCard.locator("textarea").first().fill(content);

    const saveResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/descriptions") &&
        response.request().method() === "POST" &&
        response.status() === 200,
    );
    await descCard.getByRole("button", { name: /保存|Save/i }).click();
    await saveResponse;
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(content).first()).toBeVisible();
    await captureStepScreenshot(
      page,
      testInfo,
      "courses-jwId-description-updated",
    );
  });

  test("signed-in user can post, edit, and delete comment", async ({
    page,
  }, testInfo) => {
    test.setTimeout(60000);
    await signInAsDebugUser(page, `/courses/${DEV_SEED.course.jwId}`);

    // Switch to Comments tab
    const commentsTab = page
      .getByRole("tab", { name: /评论|Comments/i })
      .first();
    await expect(commentsTab).toBeVisible();
    await commentsTab.click();
    await expect(commentsTab).toHaveAttribute("aria-selected", "true");

    // Post a new comment
    const body = `e2e-course-comment-${Date.now()}`;
    const composer = page.locator("textarea").first();
    await expect(composer).toBeVisible({ timeout: 15000 });
    await composer.fill(body);
    const createResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/comments") &&
        response.request().method() === "POST" &&
        response.status() === 200,
    );
    await page.getByRole("button", { name: /发布评论|Post comment/i }).click();
    await createResponse;
    await page.waitForLoadState("networkidle");
    const commentCard = page
      .locator('[id^="comment-"]')
      .filter({ hasText: body })
      .first();
    await expect(commentCard).toBeVisible();
    await captureStepScreenshot(page, testInfo, "courses-jwId-comment-posted");

    // Edit the comment
    await commentCard.hover();
    await commentCard.getByRole("button", { name: /编辑|Edit/i }).click();
    const editedBody = `${body}-edited`;
    await commentCard.locator("textarea").first().fill(editedBody);
    const editResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/comments/") &&
        response.request().method() === "PATCH" &&
        response.status() === 200,
    );
    await commentCard.getByRole("button", { name: /保存|Save/i }).click();
    await editResponse;
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(editedBody).first()).toBeVisible();
    await captureStepScreenshot(page, testInfo, "courses-jwId-comment-edited");

    // Delete via More actions → Delete → confirm dialog
    await commentCard.hover();
    await commentCard
      .getByRole("button", { name: /更多操作|More actions/i })
      .first()
      .click();
    const deleteResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/comments/") &&
        response.request().method() === "DELETE" &&
        response.status() === 200,
    );
    await page.getByRole("menuitem", { name: /删除|Delete/i }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /删除|Delete/i }).click();
    await deleteResponse;
  });
});

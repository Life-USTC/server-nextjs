import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { DEV_SEED } from "../../../../utils/dev-seed";
import { gotoAndWaitForReady } from "../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../utils/screenshot";
import { assertPageContract } from "../../_shared/page-contract";

test("/courses/[jwId]", async ({ page }, testInfo) => {
  await assertPageContract(page, { routePath: "/courses/[jwId]", testInfo });
});

test("/courses/[jwId] 无效参数返回 404", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/courses/999999999", {
    expectMainContent: false,
  });
  await expect(page.locator("h1")).toHaveText("404");
  await captureStepScreenshot(page, testInfo, "courses-jwId-404");
});

test("/courses/[jwId] 支持 Tab 切换", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, `/courses/${DEV_SEED.course.jwId}`);

  const tabs = page.getByRole("tab");
  const count = await tabs.count();
  if (count >= 2) {
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await captureStepScreenshot(page, testInfo, "courses-jwId-tab");
  }
});

test("/courses/[jwId] 面包屑可返回课程列表", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, `/courses/${DEV_SEED.course.jwId}`);
  const breadcrumb = page.locator('a[href="/courses"]').first();
  await expect(breadcrumb).toBeVisible();
  await breadcrumb.click();
  await expect(page).toHaveURL(/\/courses(?:\?.*)?$/);
  await captureStepScreenshot(page, testInfo, "courses-jwId-breadcrumb");
});

test("/courses/[jwId] 登录用户可编辑简介", async ({ page }, testInfo) => {
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

test("/courses/[jwId] 登录用户可发布评论并删除", async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await signInAsDebugUser(page, `/courses/${DEV_SEED.course.jwId}`);

  const commentsTab = page.getByRole("tab", { name: /评论|Comments/i }).first();
  await expect(commentsTab).toBeVisible();
  await commentsTab.click();
  await expect(commentsTab).toHaveAttribute("aria-selected", "true");

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

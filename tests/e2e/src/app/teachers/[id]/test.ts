import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { DEV_SEED } from "../../../../utils/dev-seed";
import { gotoAndWaitForReady } from "../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../utils/screenshot";
import { assertPageContract } from "../../_shared/page-contract";

test("/teachers/[id]", async ({ page }, testInfo) => {
  await assertPageContract(page, { routePath: "/teachers/[id]", testInfo });
});

test("/teachers/[id] 无效参数返回 404", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/teachers/999999999", {
    expectMainContent: false,
  });
  await expect(page.locator("h1")).toHaveText("404");
  await captureStepScreenshot(page, testInfo, "teachers-id-404");
});

test("/teachers/[id] 可跳转至 seed 班级详情", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(
    page,
    `/teachers?search=${encodeURIComponent(DEV_SEED.teacher.nameCn)}`,
  );
  const detailLink = page.locator("tbody a[href^='/teachers/']").first();
  await expect(detailLink).toBeVisible();
  await detailLink.click();

  const sectionLink = page.locator("tbody a[href^='/sections/']").first();
  await expect(sectionLink).toBeVisible();
  await captureStepScreenshot(page, testInfo, "teachers-id-sections");
});

test("/teachers/[id] 面包屑可返回教师列表", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(
    page,
    `/teachers?search=${encodeURIComponent(DEV_SEED.teacher.nameCn)}`,
  );
  await page.locator("tbody a[href^='/teachers/']").first().click();
  const breadcrumb = page.locator('a[href="/teachers"]').first();
  await expect(breadcrumb).toBeVisible();
  await breadcrumb.click();
  await expect(page).toHaveURL(/\/teachers(?:\?.*)?$/);
  await captureStepScreenshot(page, testInfo, "teachers-id-breadcrumb");
});

test("/teachers/[id] 登录用户可编辑简介", async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await signInAsDebugUser(page, "/teachers");

  await gotoAndWaitForReady(
    page,
    `/teachers?search=${encodeURIComponent(DEV_SEED.teacher.nameCn)}`,
  );
  await page.locator("tbody a[href^='/teachers/']").first().click();
  await page.waitForLoadState("networkidle");

  const descCard = page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByText(/简介|Description/i) })
    .first();
  await expect(descCard).toBeVisible();

  await descCard.getByRole("button", { name: /^编辑$|^Edit$/i }).click();
  const content = `e2e-teacher-desc-${Date.now()}`;
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
    "teachers-id-description-updated",
  );
});

test("/teachers/[id] 登录用户可发布评论并删除", async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await signInAsDebugUser(page, "/teachers");

  await gotoAndWaitForReady(
    page,
    `/teachers?search=${encodeURIComponent(DEV_SEED.teacher.nameCn)}`,
  );
  await page.locator("tbody a[href^='/teachers/']").first().click();
  await page.waitForLoadState("networkidle");

  const commentsTab = page.getByRole("tab", { name: /评论|Comments/i }).first();
  await expect(commentsTab).toBeVisible();
  await commentsTab.click();
  await expect(commentsTab).toHaveAttribute("aria-selected", "true");

  const body = `e2e-teacher-comment-${Date.now()}`;

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
  await captureStepScreenshot(page, testInfo, "teachers-id-comment-posted");

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
  await captureStepScreenshot(page, testInfo, "teachers-id-comment-edited");

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

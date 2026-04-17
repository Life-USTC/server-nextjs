/**
 * E2E tests for /sections/[jwId] — Section Detail Page
 *
 * ## Data Represented
 * - Section with course, semester, campus, teachers, schedules, exams
 * - Seed section: DEV-CS201.01 (jwId 9902001) for course "软件工程实践"
 * - Comments aggregated from section, course, and section-teacher sources
 * - Homework items with title, due date, completion toggle
 *
 * ## UI/UX Elements
 * - Breadcrumbs: Home > Sections > {section.code}
 * - h1: course name (primary + secondary)
 * - Tabs: "homeworks" (default), "calendar", "comments" (with count)
 * - Calendar tab: EventCalendar with schedule + exam events, mini calendar
 * - Comments tab: CommentsSection with section/course/teacher sub-tabs
 * - Homework tab: HomeworkPanel (create/edit/delete/completion toggle/discuss)
 * - Sidebar: Description panel (editable), Basic Info card
 * - Subscription button (subscribe/unsubscribe, login-gated)
 * - Calendar export dialog (single URL + subscription URL, copy buttons)
 *
 * ## Edge Cases
 * - Invalid jwId → notFound() → 404 page
 * - Unauthenticated subscribe click prompts login dialog
 * - Calendar link copy requires clipboard permissions
 * - Homework creation via sheet, edit inline, completion toggle via PUT
 * - Comment CRUD: post → react → edit → reply → delete (with API waits)
 * - Attachment upload: POST /api/uploads → PUT S3 signed URL → POST /api/uploads/complete
 */
import { expect, test } from "@playwright/test";
import { signInAsDebugUser, signInAsDevAdmin } from "../../../../utils/auth";
import { DEV_SEED } from "../../../../utils/dev-seed";
import { gotoAndWaitForReady } from "../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../utils/screenshot";
import { assertPageContract } from "../../_shared/page-contract";

const SECTION_URL = `/sections/${DEV_SEED.section.jwId}`;

test.describe("/sections/[jwId]", () => {
  test("contract", async ({ page }, testInfo) => {
    await assertPageContract(page, {
      routePath: "/sections/[jwId]",
      testInfo,
    });
  });

  test("404 for invalid param", async ({ page }, testInfo) => {
    await gotoAndWaitForReady(page, "/sections/999999999", {
      expectMainContent: false,
    });
    await expect(page.locator("h1")).toHaveText("404");
    await captureStepScreenshot(page, testInfo, "sections-jwId-404");
  });

  test("tab switching", async ({ page }, testInfo) => {
    await gotoAndWaitForReady(page, SECTION_URL);

    const nextTab = page.locator('[role="tab"][aria-selected="false"]').first();
    if ((await nextTab.count()) > 0) {
      const tabId = await nextTab.getAttribute("id");
      await nextTab.click();
      expect(tabId).toBeTruthy();
      await expect(page.locator(`[role="tab"]#${tabId}`)).toHaveAttribute(
        "aria-selected",
        "true",
      );
      await captureStepScreenshot(page, testInfo, "sections-jwId-tab");
    }
  });

  test("breadcrumb navigates back", async ({ page }, testInfo) => {
    await gotoAndWaitForReady(page, SECTION_URL);
    const breadcrumb = page.locator('a[href="/sections"]').first();
    await expect(breadcrumb).toBeVisible();
    await breadcrumb.click();
    await expect(page).toHaveURL(/\/sections(?:\?.*)?$/);
    await captureStepScreenshot(page, testInfo, "sections-jwId-breadcrumb");
  });

  test("shows course name as primary section heading", async ({
    page,
  }, testInfo) => {
    await gotoAndWaitForReady(page, SECTION_URL);

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: DEV_SEED.course.nameEn,
      }),
    ).toBeVisible();
    await expect(page.getByText(DEV_SEED.section.code).first()).toBeVisible();

    await captureStepScreenshot(page, testInfo, "sections-jwId-heading");
  });

  test("基本信息卡片显示班级字段", async ({ page }, testInfo) => {
    await gotoAndWaitForReady(page, SECTION_URL);
    await expect(page.getByText(DEV_SEED.section.code).first()).toBeVisible();
    await expect(
      page.getByText(DEV_SEED.metadata.campusNameCn).first(),
    ).toBeVisible();
    await expect(page.getByText(DEV_SEED.course.nameCn).first()).toBeVisible();
    await captureStepScreenshot(page, testInfo, "sections-jwId-basic-info");
  });

  test("非正式选课免责声明可见", async ({ page }, testInfo) => {
    await gotoAndWaitForReady(page, SECTION_URL);
    await expect(
      page.getByText(/非官方|非正式|not.*official|not.*enrollment/i).first(),
    ).toBeVisible();
    await captureStepScreenshot(page, testInfo, "sections-jwId-disclaimer");
  });

  test("signed-in user can post, react, edit, reply, and delete comment", async ({
    page,
  }, testInfo) => {
    test.setTimeout(60000);
    await signInAsDevAdmin(page, SECTION_URL);

    const commentsTab = page
      .getByRole("tab", { name: /评论|Comments/i })
      .first();
    await commentsTab.click();
    await expect(commentsTab).toHaveAttribute("aria-selected", "true");

    // Post comment
    const body = `e2e-section-comment-${Date.now()}`;
    const composer = page.locator("textarea").first();
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
    await expect(page.getByText(body).first()).toBeVisible();
    await captureStepScreenshot(page, testInfo, "comment-posted");

    const commentCard = page
      .locator('[id^="comment-"]')
      .filter({ hasText: body })
      .first();
    await expect(commentCard).toBeVisible();

    // React with upvote
    const reactionResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/comments/") &&
        response.url().includes("/reactions") &&
        response.request().method() === "POST" &&
        response.status() === 200,
    );
    await commentCard
      .getByRole("button", { name: /表情|Reactions/i })
      .click({ force: true });
    await page.getByRole("menuitem", { name: /点赞|Upvote/i }).click();
    await reactionResponse;
    await expect(commentCard.getByRole("button", { name: /👍/ })).toBeVisible();
    await captureStepScreenshot(page, testInfo, "comment-upvoted");

    // Edit comment
    await commentCard
      .getByRole("button", { name: /编辑|Edit/i })
      .click({ force: true });
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
    await captureStepScreenshot(page, testInfo, "comment-edited");

    // Reply to comment
    await commentCard
      .getByRole("button", { name: /回复|Reply/i })
      .click({ force: true });
    const replyBody = `e2e-reply-${Date.now()}`;
    const replyEditor = page
      .locator(".rounded-2xl.border.border-dashed")
      .first();
    await expect(replyEditor).toBeVisible();
    await replyEditor.locator("textarea").fill(replyBody);
    const replyResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/comments") &&
        response.request().method() === "POST" &&
        response.status() === 200,
    );
    await replyEditor.getByRole("button", { name: /回复|Reply/i }).click();
    await replyResponse;
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(replyBody).first()).toBeVisible();
    await captureStepScreenshot(page, testInfo, "comment-replied");

    // Delete comment
    await commentCard
      .getByRole("button", { name: /更多操作|More actions/i })
      .first()
      .click({ force: true });
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
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(editedBody).first()).not.toBeVisible();
    await captureStepScreenshot(page, testInfo, "comment-deleted");
  });

  test("unauthenticated subscribe prompts login", async ({
    page,
  }, testInfo) => {
    await gotoAndWaitForReady(page, SECTION_URL);

    const subscribeButton = page
      .getByRole("button", { name: /关注班级|Subscribe to section/i })
      .first();
    if ((await subscribeButton.count()) === 0) {
      await expect(page.locator("#main-content")).toBeVisible();
      return;
    }

    await subscribeButton.click();
    const loginDialog = page
      .getByRole("dialog")
      .or(page.getByRole("alertdialog"))
      .first();
    await expect(loginDialog).toBeVisible();
    await captureStepScreenshot(
      page,
      testInfo,
      "section-subscribe-login-required",
    );

    const loginButton = loginDialog.getByRole("button", {
      name: /登录后关注|Sign in to follow/i,
    });
    if ((await loginButton.count()) > 0) {
      await loginButton.click();
      await expect(page).toHaveURL(/\/signin(?:\?.*)?$/);
    }
  });

  test("signed-in user can open calendar dialog and copy links", async ({
    page,
  }, testInfo) => {
    test.setTimeout(60000);
    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"]);
    await signInAsDebugUser(page, SECTION_URL);

    const calendarButton = page
      .getByRole("button", { name: /添加到日历|Add to calendar/i })
      .first();
    if ((await calendarButton.count()) === 0) {
      await expect(page.locator("#main-content")).toBeVisible();
      return;
    }

    await calendarButton.click();
    const calDialog = page.locator('[data-slot="dialog-popup"]').first();
    await expect(calDialog).toBeVisible();

    const subscriptionUrl = calDialog.locator("#subscription-url");
    const singleUrl = calDialog.locator("#calendar-url");
    await expect(singleUrl).toBeVisible();

    const singlePlaceholder =
      (await singleUrl.getAttribute("placeholder")) ?? "";
    expect(singlePlaceholder).toContain(
      `/api/sections/${DEV_SEED.section.jwId}/calendar.ics`,
    );

    const subscriptionPlaceholder =
      (await subscriptionUrl.getAttribute("placeholder")) ?? "";
    expect(subscriptionPlaceholder).toContain("/api/users/");
    expect(subscriptionPlaceholder).toContain(":");
    expect(subscriptionPlaceholder).toContain("/calendar.ics");
    expect(subscriptionPlaceholder).not.toContain("token=");

    // Copy single calendar URL
    const singleRow = calDialog
      .locator("div")
      .filter({ has: singleUrl })
      .first();
    await singleRow
      .getByRole("button", { name: /复制|Copy/i })
      .first()
      .click();
    const singleClipboard = await page.evaluate(async () => {
      return navigator.clipboard.readText();
    });
    expect(singleClipboard).toContain(
      `/api/sections/${DEV_SEED.section.jwId}/calendar.ics`,
    );

    // Copy subscription URL
    const subscriptionRow = calDialog
      .locator("div")
      .filter({ has: subscriptionUrl })
      .first();
    await subscriptionRow
      .getByRole("button", { name: /复制|Copy/i })
      .first()
      .click();
    const subscriptionClipboard = await page.evaluate(async () => {
      return navigator.clipboard.readText();
    });
    expect(subscriptionClipboard).toContain("/api/users/");
    expect(subscriptionClipboard).toContain(":");
    expect(subscriptionClipboard).toContain("/calendar.ics");
    expect(subscriptionClipboard).not.toContain("token=");
    await captureStepScreenshot(
      page,
      testInfo,
      "section-calendar-links-copied",
    );

    await calDialog.getByRole("button", { name: /关闭|Close/i }).click();
    await expect(calDialog).not.toBeVisible();
  });

  test("subscribe and unsubscribe toggle", async ({ page }, testInfo) => {
    test.setTimeout(60000);
    await signInAsDebugUser(page, SECTION_URL);

    const subscribe = page.getByRole("button", {
      name: /关注班级|Subscribe to section/i,
    });
    const unsubscribe = page.getByRole("button", {
      name: /取消关注|Unsubscribe from section/i,
    });

    if ((await subscribe.count()) === 0 && (await unsubscribe.count()) === 0) {
      await expect(page.locator("#main-content")).toBeVisible();
      return;
    }

    if ((await subscribe.count()) > 0) {
      await subscribe.first().click();
      await expect(unsubscribe.first()).toBeVisible({ timeout: 15_000 });
      await captureStepScreenshot(page, testInfo, "section-subscribed");
    }

    if ((await unsubscribe.count()) > 0) {
      await unsubscribe.first().click();
      await expect(subscribe.first()).toBeVisible({ timeout: 15_000 });
      await captureStepScreenshot(page, testInfo, "section-unsubscribed");
    }
  });

  test("signed-in user can create homework and open discussion", async ({
    page,
  }, testInfo) => {
    test.setTimeout(60000);
    await signInAsDebugUser(page, SECTION_URL);

    const homeworksTab = page
      .getByRole("tab", { name: /作业|Homework|Homeworks/i })
      .first();
    if ((await homeworksTab.count()) === 0) {
      await expect(page.locator("#main-content")).toBeVisible();
      return;
    }
    await homeworksTab.click();

    const showCreate = page
      .getByRole("button", { name: /^新建$|^Create$/i })
      .first();
    if ((await showCreate.count()) > 0) {
      await showCreate.click();
    }

    const sheet = page.locator('[data-slot="sheet-popup"]').first();
    if (!(await sheet.isVisible().catch(() => false))) {
      await showCreate.click();
    }
    await expect(sheet).toBeVisible();

    const title = `e2e-section-homework-${Date.now()}`;
    await sheet.getByTestId("section-homework-title").fill(title);
    const createResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/homeworks") &&
        response.request().method() === "POST" &&
        response.status() === 200,
    );
    await sheet
      .getByRole("button", { name: /创建作业|Create homework/i })
      .click();
    await createResponse;
    await page.waitForLoadState("networkidle");

    const hwCard = page
      .locator('[data-slot="card"]')
      .filter({
        has: page.locator('[data-slot="card-title"]', { hasText: title }),
      })
      .first();
    await expect(hwCard).toBeVisible();
    await captureStepScreenshot(page, testInfo, "section-homework-created");

    // Open discussion
    const discussButton = hwCard
      .getByRole("button", { name: /讨论|Discuss/i })
      .first();
    if ((await discussButton.count()) > 0) {
      await discussButton.click();
      const discussSheet = page.locator('[data-slot="sheet-popup"]').first();
      await expect(discussSheet).toBeVisible();
      await captureStepScreenshot(
        page,
        testInfo,
        "section-homework-discuss-open",
      );
      await discussSheet
        .getByRole("button", { name: /关闭|Close|取消|Cancel/i })
        .first()
        .click();
    }

    // Cleanup: delete homework
    const deleteButton = hwCard
      .getByRole("button", { name: /删除|Delete/i })
      .first();
    if ((await deleteButton.count()) > 0) {
      await deleteButton.click();
      const deleteDialog = page.getByRole("alertdialog");
      await expect(deleteDialog).toBeVisible();
      const deleteResponse = page.waitForResponse(
        (response) =>
          response.url().includes("/api/homeworks/") &&
          response.request().method() === "DELETE" &&
          response.status() === 200,
      );
      await deleteDialog
        .getByRole("button", { name: /确认删除|Delete/i })
        .click();
      await deleteResponse;
      await page.waitForLoadState("networkidle");
    }
  });

  test("signed-in user can edit homework and toggle completion", async ({
    page,
  }, testInfo) => {
    test.setTimeout(60000);
    await signInAsDebugUser(page, SECTION_URL);

    const homeworksTab = page
      .getByRole("tab", { name: /作业|Homework|Homeworks/i })
      .first();
    await expect(homeworksTab).toBeVisible();
    await homeworksTab.click();

    const showCreate = page
      .getByRole("button", { name: /新建|Create/i })
      .first();
    if ((await showCreate.count()) === 0) {
      await expect(page.locator("#main-content")).toBeVisible();
      return;
    }
    await showCreate.click();
    const sheet = page.locator('[data-slot="sheet-popup"]').first();
    if (!(await sheet.isVisible().catch(() => false))) {
      await showCreate.click();
    }
    await expect(sheet).toBeVisible();

    const title = `e2e-edit-homework-${Date.now()}`;
    await sheet.getByTestId("section-homework-title").fill(title);
    const createResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/homeworks") &&
        response.request().method() === "POST" &&
        response.status() === 200,
    );
    await sheet
      .getByRole("button", { name: /创建作业|Create homework/i })
      .click();
    await createResponse;
    await page.waitForLoadState("networkidle");

    const hwCard = page
      .locator('[data-slot="card"]')
      .filter({
        has: page.locator('[data-slot="card-title"]', { hasText: title }),
      })
      .first();
    await expect(hwCard).toBeVisible();

    // Edit homework title
    await hwCard
      .getByRole("button", { name: /编辑信息|Edit details/i })
      .click();
    const editTitle = hwCard.locator('[id^="homework-edit-title-"]');
    await expect(editTitle).toBeVisible();
    const updatedTitle = `${title}-updated`;
    await editTitle.fill(updatedTitle);

    const patchHomework = page.waitForResponse(
      (response) =>
        response.url().includes("/api/homeworks/") &&
        response.request().method() === "PATCH" &&
        response.status() === 200,
    );
    await hwCard
      .getByRole("button", { name: /保存修改|Save changes/i })
      .click();
    await patchHomework;
    await page.waitForLoadState("networkidle");

    const updatedCard = page
      .locator('[data-slot="card"]')
      .filter({
        has: page.locator('[data-slot="card-title"]', {
          hasText: updatedTitle,
        }),
      })
      .first();
    await expect(updatedCard).toBeVisible();
    await captureStepScreenshot(page, testInfo, "section-homework-updated");

    // Toggle completion
    const completionLabel = updatedCard.locator(
      'label[for^="homework-completed-"]',
    );
    if ((await completionLabel.count()) > 0) {
      const [toggleResponse] = await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes("/api/homeworks/") &&
            response.url().includes("/completion") &&
            response.request().method() === "PUT" &&
            response.status() === 200,
        ),
        completionLabel.first().click(),
      ]);
      expect(toggleResponse.status()).toBe(200);
      await captureStepScreenshot(
        page,
        testInfo,
        "section-homework-completion-toggled",
      );
    }

    // Cleanup: delete homework
    const deleteButton = updatedCard
      .getByRole("button", { name: /删除|Delete/i })
      .first();
    if ((await deleteButton.count()) > 0) {
      await deleteButton.click();
      const deleteDialog = page.getByRole("alertdialog");
      await expect(deleteDialog).toBeVisible();
      const deleteResponse = page.waitForResponse(
        (response) =>
          response.url().includes("/api/homeworks/") &&
          response.request().method() === "DELETE" &&
          response.status() === 200,
      );
      await deleteDialog
        .getByRole("button", { name: /确认删除|Delete/i })
        .click();
      await deleteResponse;
    }
  });

  test("comment can upload attachment and open it", async ({
    page,
  }, testInfo) => {
    test.fixme(!process.env.S3_BUCKET, "Requires S3 configuration");
    test.setTimeout(60000);
    await signInAsDebugUser(page, SECTION_URL);

    const commentsTab = page
      .getByRole("tab", { name: /评论|Comments/i })
      .first();
    await commentsTab.click();
    await expect(commentsTab).toHaveAttribute("aria-selected", "true");

    const composerCard = page
      .locator('[data-slot="card"]')
      .filter({
        has: page.getByRole("button", { name: /发布评论|Post comment/i }),
      })
      .first();
    await expect(composerCard).toBeVisible();

    // Upload attachment
    const filename = `e2e-attachment-${Date.now()}.txt`;
    const uploadCreate = page.waitForResponse(
      (response) =>
        response.url().includes("/api/uploads") &&
        response.request().method() === "POST" &&
        response.status() === 200,
    );
    const uploadPut = page.waitForResponse(
      (response) =>
        response.request().method() === "PUT" &&
        response.status() === 200 &&
        response.url().startsWith("http"),
    );
    const uploadComplete = page.waitForResponse(
      (response) =>
        response.url().includes("/api/uploads/complete") &&
        response.request().method() === "POST" &&
        response.status() === 200,
    );

    await composerCard.locator('input[type="file"]').setInputFiles({
      name: filename,
      mimeType: "text/plain",
      buffer: Buffer.from("section-attachment"),
    });
    await uploadCreate;
    await uploadPut;
    await uploadComplete;

    // Post comment with attachment
    const body = `e2e-attachment-comment-${Date.now()}`;
    await composerCard.locator("textarea").first().fill(body);
    const createComment = page.waitForResponse(
      (response) =>
        response.url().includes("/api/comments") &&
        response.request().method() === "POST" &&
        response.status() === 200,
    );
    await composerCard
      .getByRole("button", { name: /发布评论|Post comment/i })
      .click();
    await createComment;
    await page.waitForLoadState("networkidle");

    const commentCard = page
      .locator('[id^="comment-"]')
      .filter({ hasText: body })
      .first();
    await expect(commentCard).toBeVisible();
    await expect(
      commentCard
        .getByRole("button", { name: /打开附件|Open attachment/i })
        .first(),
    ).toBeVisible();
    await captureStepScreenshot(page, testInfo, "comment-attachment-posted");

    // Open attachment in new tab
    const popupPromise = page.waitForEvent("popup");
    await commentCard
      .getByRole("button", { name: /打开附件|Open attachment/i })
      .first()
      .click();
    const popup = await popupPromise;
    await popup.waitForLoadState("domcontentloaded");
    await expect(popup).toHaveURL(/\/api\/uploads\/.*\/download/);
    await popup.close();

    // Cleanup: delete comment
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
    const deleteDialog = page.getByRole("alertdialog");
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole("button", { name: /删除|Delete/i }).click();
    await deleteResponse;
  });
});

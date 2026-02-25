import { expect, test } from "@playwright/test";
import { signInAsDebugUser, signInAsDevAdmin } from "../../../../utils/auth";
import { DEV_SEED } from "../../../../utils/dev-seed";
import { gotoAndWaitForReady } from "../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../utils/screenshot";
import { assertPageContract } from "../../_shared/page-contract";

test("/sections/[jwId]", async ({ page }, testInfo) => {
  await assertPageContract(page, { routePath: "/sections/[jwId]", testInfo });
});

test("/sections/[jwId] 无效参数返回 404", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/sections/999999999", {
    expectMainContent: false,
  });
  await expect(page.locator("h1")).toHaveText("404");
  await captureStepScreenshot(page, testInfo, "sections-jwId-404");
});

test("/sections/[jwId] 支持 Tab 切换", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, `/sections/${DEV_SEED.section.jwId}`);

  const tabs = page.getByRole("tab");
  const count = await tabs.count();
  if (count >= 2) {
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await captureStepScreenshot(page, testInfo, "sections-jwId-tab");
  }
});

test("/sections/[jwId] 面包屑可返回列表", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, `/sections/${DEV_SEED.section.jwId}`);
  const breadcrumb = page.locator('a[href="/sections"]').first();
  await expect(breadcrumb).toBeVisible();
  await breadcrumb.click();
  await expect(page).toHaveURL(/\/sections(?:\?.*)?$/);
  await captureStepScreenshot(page, testInfo, "sections-jwId-breadcrumb");
});

test("/sections/[jwId] 登录用户可发布并编辑评论", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  await signInAsDevAdmin(page, `/sections/${DEV_SEED.section.jwId}`);

  const commentsTab = page.getByRole("tab", { name: /评论|Comments/i }).first();
  await commentsTab.click();
  await expect(commentsTab).toHaveAttribute("aria-selected", "true");

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
  const commentText = page.getByText(body).first();
  await expect(commentText).toBeVisible();
  await captureStepScreenshot(page, testInfo, "comment-posted");

  const commentCard = page
    .locator('[id^="comment-"]')
    .filter({ hasText: body })
    .first();
  await expect(commentCard).toBeVisible();
  await commentCard.hover();

  await commentCard.getByRole("button", { name: /表情|Reactions/i }).click();
  await page.getByRole("menuitem", { name: /点赞|Upvote/i }).click();

  await page.waitForTimeout(500);
  await captureStepScreenshot(page, testInfo, "comment-upvoted");

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
  await captureStepScreenshot(page, testInfo, "comment-edited");

  await commentCard.hover();
  await commentCard.getByRole("button", { name: /回复|Reply/i }).click();
  const replyBody = `e2e-reply-${Date.now()}`;

  const replyEditor = page.locator(".rounded-2xl.border.border-dashed").first();
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

  await commentCard.hover();
  const moreActionsButton = commentCard
    .getByRole("button", { name: /更多操作|More actions/i })
    .first();
  await expect(moreActionsButton).toBeVisible();
  await moreActionsButton.click();

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

test("/sections/[jwId] 未登录点击订阅会提示登录", async ({
  page,
}, testInfo) => {
  await gotoAndWaitForReady(page, `/sections/${DEV_SEED.section.jwId}`);

  const subscribeButton = page
    .getByRole("button", { name: /加入已选课班级|Subscribe/i })
    .first();
  if ((await subscribeButton.count()) === 0) {
    await expect(page.locator("#main-content")).toBeVisible();
    return;
  }

  await subscribeButton.click();
  const dialog = page
    .getByRole("dialog")
    .or(page.getByRole("alertdialog"))
    .first();
  await expect(dialog).toBeVisible();
  await captureStepScreenshot(
    page,
    testInfo,
    "section-subscribe-login-required",
  );

  const loginButton = dialog.getByRole("button", {
    name: /登录后订阅|Log in/i,
  });
  if ((await loginButton.count()) > 0) {
    await loginButton.click();
    await expect(page).toHaveURL(/\/signin(?:\?.*)?$/);
  }
});

test("/sections/[jwId] 登录后可打开日历弹窗并复制链接", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await signInAsDebugUser(page, `/sections/${DEV_SEED.section.jwId}`);

  const calendarButton = page
    .getByRole("button", { name: /添加到日历|Add to calendar/i })
    .first();
  if ((await calendarButton.count()) === 0) {
    await expect(page.locator("#main-content")).toBeVisible();
    return;
  }

  await calendarButton.click();
  const dialog = page.locator('[data-slot="dialog-popup"]').first();
  await expect(dialog).toBeVisible();

  const subscriptionUrl = dialog.locator("#subscription-url");
  const singleUrl = dialog.locator("#calendar-url");
  await expect(singleUrl).toBeVisible();

  const singlePlaceholder = (await singleUrl.getAttribute("placeholder")) ?? "";
  expect(singlePlaceholder).toContain(
    `/api/sections/${DEV_SEED.section.jwId}/calendar.ics`,
  );

  const subscriptionPlaceholder =
    (await subscriptionUrl.getAttribute("placeholder")) ?? "";
  expect(subscriptionPlaceholder).toContain("/api/calendar-subscriptions/");
  expect(subscriptionPlaceholder).toContain("token=");

  const singleRow = dialog.locator("div").filter({ has: singleUrl }).first();
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

  const subscriptionRow = dialog
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
  expect(subscriptionClipboard).toContain("/api/calendar-subscriptions/");
  expect(subscriptionClipboard).toContain("token=");
  await captureStepScreenshot(page, testInfo, "section-calendar-links-copied");

  await dialog.getByRole("button", { name: /关闭|Close/i }).click();
  await expect(dialog).not.toBeVisible();
});

test("/sections/[jwId] 登录后可订阅并退订（按钮状态切换）", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  await signInAsDebugUser(page, `/sections/${DEV_SEED.section.jwId}`);

  const subscribe = page.getByRole("button", {
    name: /加入已选课班级|Subscribe/i,
  });
  const unsubscribe = page.getByRole("button", {
    name: /取消已选|Unsubscribe/i,
  });

  if ((await subscribe.count()) === 0 && (await unsubscribe.count()) === 0) {
    await expect(page.locator("#main-content")).toBeVisible();
    return;
  }

  if ((await subscribe.count()) > 0) {
    const subscribeResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/subscriptions") &&
        response.request().method() === "POST" &&
        response.status() === 200,
    );
    await subscribe.first().click();
    await subscribeResponse;
    await expect(unsubscribe.first()).toBeVisible();
    await captureStepScreenshot(page, testInfo, "section-subscribed");
  }

  if ((await unsubscribe.count()) > 0) {
    const unsubscribeResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/subscriptions") &&
        response.request().method() === "DELETE" &&
        response.status() === 200,
    );
    await unsubscribe.first().click();
    await unsubscribeResponse;
    await expect(subscribe.first()).toBeVisible();
    await captureStepScreenshot(page, testInfo, "section-unsubscribed");
  }
});

test("/sections/[jwId] 登录用户可创建作业并打开讨论", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  await signInAsDebugUser(page, `/sections/${DEV_SEED.section.jwId}`);

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

  const deleteButton = hwCard
    .getByRole("button", { name: /删除|Delete/i })
    .first();
  if ((await deleteButton.count()) > 0) {
    await deleteButton.click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    const deleteResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/homeworks/") &&
        response.request().method() === "DELETE" &&
        response.status() === 200,
    );
    await dialog.getByRole("button", { name: /确认删除|Delete/i }).click();
    await deleteResponse;
    await page.waitForLoadState("networkidle");
  }
});

test("/sections/[jwId] 登录用户可编辑作业并切换完成状态", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  await signInAsDebugUser(page, `/sections/${DEV_SEED.section.jwId}`);

  const homeworksTab = page
    .getByRole("tab", { name: /作业|Homework|Homeworks/i })
    .first();
  await expect(homeworksTab).toBeVisible();
  await homeworksTab.click();

  const showCreate = page
    .getByRole("button", { name: /^新建$|^Create$/i })
    .first();
  if ((await showCreate.count()) > 0) {
    await showCreate.click();
  }
  const sheet = page.locator('[data-slot="sheet-popup"]').first();
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

  await hwCard.getByRole("button", { name: /编辑信息|Edit details/i }).click();
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
  await hwCard.getByRole("button", { name: /保存修改|Save changes/i }).click();
  await patchHomework;
  await page.waitForLoadState("networkidle");

  await expect(
    page
      .locator('[data-slot="card"]')
      .filter({
        has: page.locator('[data-slot="card-title"]', {
          hasText: updatedTitle,
        }),
      })
      .first(),
  ).toBeVisible();
  await captureStepScreenshot(page, testInfo, "section-homework-updated");

  const updatedCard = page
    .locator('[data-slot="card"]')
    .filter({
      has: page.locator('[data-slot="card-title"]', { hasText: updatedTitle }),
    })
    .first();

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

  const deleteButton = updatedCard
    .getByRole("button", { name: /删除|Delete/i })
    .first();
  if ((await deleteButton.count()) > 0) {
    await deleteButton.click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    const deleteResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/homeworks/") &&
        response.request().method() === "DELETE" &&
        response.status() === 200,
    );
    await dialog.getByRole("button", { name: /确认删除|Delete/i }).click();
    await deleteResponse;
  }
});

test("/sections/[jwId] 评论可上传附件并在发布后可打开", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  await signInAsDebugUser(page, `/sections/${DEV_SEED.section.jwId}`);

  const commentsTab = page.getByRole("tab", { name: /评论|Comments/i }).first();
  await commentsTab.click();
  await expect(commentsTab).toHaveAttribute("aria-selected", "true");

  const composerCard = page
    .locator('[data-slot="card"]')
    .filter({
      has: page.getByRole("button", { name: /发布评论|Post comment/i }),
    })
    .first();
  await expect(composerCard).toBeVisible();

  const filename = `e2e-attachment-${Date.now()}.txt`;
  const uploadCreate = page.waitForResponse(
    (response) =>
      response.url().includes("/api/uploads") &&
      response.request().method() === "POST" &&
      response.status() === 200,
  );
  const uploadPut = page.waitForResponse(
    (response) =>
      response.url().includes("/api/mock-s3") &&
      response.request().method() === "PUT" &&
      response.status() === 200,
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

  const popupPromise = page.waitForEvent("popup");
  await commentCard
    .getByRole("button", { name: /打开附件|Open attachment/i })
    .first()
    .click();
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded");
  await expect(popup).toHaveURL(/\/api\/(uploads\/.*\/download|mock-s3)/);
  await popup.close();

  await commentCard.hover();
  const moreActionsButton = commentCard
    .getByRole("button", { name: /更多操作|More actions/i })
    .first();
  await moreActionsButton.click();
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

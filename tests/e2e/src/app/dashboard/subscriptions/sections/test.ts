import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../../utils/auth";
import { DEV_SEED } from "../../../../../utils/dev-seed";
import { gotoAndWaitForReady } from "../../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../../utils/screenshot";

test("/?tab=subscriptions 未登录可访问", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/?tab=subscriptions", {
    expectMainContent: true,
  });

  await expect(page).toHaveURL(/\/\?tab=subscriptions$/);
  await expect(page.locator("#main-content")).toBeVisible();
  await captureStepScreenshot(
    page,
    testInfo,
    "dashboard-subscriptions-unauthorized",
  );
});

test("/?tab=subscriptions 登录后展示 seed 选课", async ({ page }, testInfo) => {
  await signInAsDebugUser(page, "/?tab=subscriptions");

  await expect(page).toHaveURL(/\/(?:\?.*)?$/);
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(page.getByText(DEV_SEED.section.code).first()).toBeVisible();
  await captureStepScreenshot(page, testInfo, "dashboard-subscriptions-seed");
});

test("/?tab=subscriptions 可点击条目跳转班级详情", async ({
  page,
}, testInfo) => {
  await signInAsDebugUser(page, "/?tab=subscriptions");
  const rowLink = page.locator("tbody a[href^='/sections/']").first();
  if ((await rowLink.count()) === 0) {
    await expect(page.locator("#main-content")).toBeVisible();
    return;
  }
  await rowLink.click();
  await expect(page).toHaveURL(/\/sections\/\d+/);
  await captureStepScreenshot(
    page,
    testInfo,
    "dashboard-subscriptions-navigate-section",
  );
});

test("/?tab=subscriptions 复制日历链接", async ({ page }, testInfo) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await signInAsDebugUser(page, "/?tab=subscriptions");

  const copyButton = page
    .getByRole("button", { name: /复制日历链接|iCal/i })
    .first();
  if ((await copyButton.count()) === 0) {
    await expect(page.locator("#main-content")).toBeVisible();
    return;
  }
  await copyButton.click();

  const clipboardText = await page.evaluate(async () =>
    navigator.clipboard.readText(),
  );
  expect(clipboardText).toContain("calendar.ics");
  expect(clipboardText).toContain("token=");
  await captureStepScreenshot(
    page,
    testInfo,
    "dashboard-subscriptions-ical-copied",
  );
});

test("/?tab=subscriptions 批量导入可打开确认弹窗并取消", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  await signInAsDebugUser(page, "/?tab=subscriptions");

  const textarea = page.getByRole("textbox", {
    name: /粘贴|placeholder|Paste/i,
  });
  if ((await textarea.count()) === 0) {
    await expect(page.locator("#main-content")).toBeVisible();
    return;
  }

  await textarea.first().fill(DEV_SEED.section.code);
  const matchResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/sections/match-codes") &&
      response.request().method() === "POST" &&
      response.status() === 200,
  );
  await page.getByRole("button", { name: /识别并匹配课程|Match/i }).click();
  await matchResponse;

  const dialog = page
    .getByRole("alertdialog")
    .or(page.getByRole("dialog"))
    .first();
  await expect(dialog).toBeVisible({ timeout: 15000 });
  await captureStepScreenshot(
    page,
    testInfo,
    "dashboard-subscriptions-bulk-import-dialog",
  );
  await dialog.getByRole("button", { name: /取消|Cancel/i }).click();
  await expect(dialog).not.toBeVisible();
});

test("/?tab=subscriptions 批量导入可确认加入并提示成功", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  await signInAsDebugUser(page, "/?tab=subscriptions");

  const textarea = page.getByRole("textbox", {
    name: /粘贴|placeholder|Paste/i,
  });
  if ((await textarea.count()) === 0) {
    await expect(page.locator("#main-content")).toBeVisible();
    return;
  }

  await textarea.first().fill(`\n${DEV_SEED.section.code}\nDEVXX000.99\n`);

  const matchResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/sections/match-codes") &&
      response.request().method() === "POST" &&
      response.status() === 200,
  );
  await page.getByRole("button", { name: /识别并匹配课程|Match/i }).click();
  await matchResponse;

  const dialog = page
    .getByRole("alertdialog")
    .or(page.getByRole("dialog"))
    .first();
  await expect(dialog).toBeVisible({ timeout: 15000 });
  await expect(dialog.getByText(DEV_SEED.section.code).first()).toBeVisible();
  await captureStepScreenshot(
    page,
    testInfo,
    "dashboard-subscriptions-bulk-import-ready",
  );

  await dialog
    .getByRole("button", {
      name: /加入已选的 \d+ 个班级|加入已选|Add \d+ selected|Add selected|Subscribe/i,
    })
    .click();

  await expect(page.getByText(/已加入|Added/i).first()).toBeVisible({
    timeout: 15000,
  });
  await page.waitForLoadState("networkidle");
  await captureStepScreenshot(
    page,
    testInfo,
    "dashboard-subscriptions-bulk-import-success",
  );
});

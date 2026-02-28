import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { DEV_SEED } from "../../../../utils/dev-seed";
import { gotoAndWaitForReady } from "../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../utils/screenshot";

test.describe.configure({ mode: "serial" });

test("/dashboard/uploads 未登录重定向到登录页", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/dashboard/uploads", {
    expectMainContent: false,
  });

  await expect(page).toHaveURL(/\/signin(?:\?.*)?$/);
  await expect(page.getByRole("button", { name: /USTC/i })).toBeVisible();
  await captureStepScreenshot(page, testInfo, "dashboard-uploads-unauthorized");
});

test("/dashboard/uploads 登录后重定向到首页", async ({ page }, testInfo) => {
  await signInAsDebugUser(page, "/");

  await expect(page).toHaveURL(/\/(?:\?.*)?$/);
  await expect(page.locator("#main-content")).toBeVisible();
  await captureStepScreenshot(page, testInfo, "dashboard-uploads-seed");
});

test.skip("/dashboard/uploads 可重命名并恢复 seed 文件名", async ({
  page,
}, testInfo) => {
  await signInAsDebugUser(page, "/");

  const originalName = DEV_SEED.uploads.firstFilename;
  const renamedName = `e2e-${Date.now()}-${originalName}`;

  const originalRow = page
    .locator("tr")
    .filter({ hasText: originalName })
    .first();
  await expect(originalRow).toBeVisible();

  await originalRow.getByRole("button", { name: /重命名|Rename/i }).click();
  const renameInput = page.locator("tr input").first();
  await expect(renameInput).toBeVisible();
  await renameInput.fill(renamedName);

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/uploads/") &&
        response.request().method() === "PATCH" &&
        response.status() === 200,
    ),
    page
      .getByRole("button", { name: /保存|Save/i })
      .first()
      .click(),
  ]);
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(renamedName).first()).toBeVisible();
  await captureStepScreenshot(page, testInfo, "dashboard-uploads-renamed");

  const renamedRow = page
    .locator("tr")
    .filter({ hasText: renamedName })
    .first();
  await renamedRow.getByRole("button", { name: /重命名|Rename/i }).click();
  const rollbackInput = page.locator("tr input").first();
  await expect(rollbackInput).toBeVisible();
  await rollbackInput.fill(originalName);

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/uploads/") &&
        response.request().method() === "PATCH" &&
        response.status() === 200,
    ),
    page
      .getByRole("button", { name: /保存|Save/i })
      .first()
      .click(),
  ]);
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(originalName).first()).toBeVisible();
  await captureStepScreenshot(
    page,
    testInfo,
    "dashboard-uploads-rename-rollback",
  );
});

test.skip("/dashboard/uploads 删除弹窗可打开并取消", async ({
  page,
}, testInfo) => {
  await signInAsDebugUser(page, "/");

  const originalName = DEV_SEED.uploads.firstFilename;
  const row = page.locator("tr").filter({ hasText: originalName }).first();
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: /删除|Delete/i }).click();
  await expect(
    page.getByText(/确定删除|Delete .*can't be undone/i),
  ).toBeVisible();
  await captureStepScreenshot(
    page,
    testInfo,
    "dashboard-uploads-delete-dialog",
  );
  await page.getByRole("button", { name: /取消|Cancel/i }).click();

  await expect(row).toBeVisible();
  await expect(page.getByText(originalName).first()).toBeVisible();
  await captureStepScreenshot(
    page,
    testInfo,
    "dashboard-uploads-delete-cancelled",
  );
});

test.skip("/dashboard/uploads 可上传并出现在列表", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  await signInAsDebugUser(page, "/");

  const filename = `e2e-upload-${Date.now()}.txt`;

  const createResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/uploads") &&
      response.request().method() === "POST" &&
      response.status() === 200,
  );

  const completeResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/uploads/complete") &&
      response.request().method() === "POST" &&
      response.status() >= 200,
  );

  const putResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/mock-s3") &&
      response.request().method() === "PUT",
  );

  await page.locator("input#upload-file").setInputFiles({
    name: filename,
    mimeType: "text/plain",
    buffer: Buffer.from("hello mock s3"),
  });

  await expect(
    page
      .getByText(new RegExp(filename.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")))
      .first(),
  ).toBeVisible();
  const presignResponse = await createResponse;
  const presignJson = (await presignResponse.json()) as { url?: string };
  expect(presignJson.url).toContain("/api/mock-s3");

  const putResponse = await putResponsePromise;
  expect(putResponse.status()).toBe(200);

  const complete = await completeResponse;
  expect(complete.status()).toBe(200);
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(filename).first()).toBeVisible();
  await captureStepScreenshot(page, testInfo, "dashboard-uploads-uploaded");
});

test.skip("/dashboard/uploads 复制链接写入剪贴板", async ({
  page,
}, testInfo) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await signInAsDebugUser(page, "/");

  const filename = `e2e-upload-${Date.now()}.txt`;
  const createResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/uploads") &&
      response.request().method() === "POST" &&
      response.status() === 200,
  );
  const completeResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/uploads/complete") &&
      response.request().method() === "POST" &&
      response.status() >= 200,
  );
  await page.locator("input#upload-file").setInputFiles({
    name: filename,
    mimeType: "text/plain",
    buffer: Buffer.from("clipboard"),
  });
  await createResponse;
  const complete = await completeResponse;
  expect(complete.status()).toBe(200);
  await page.waitForLoadState("networkidle");

  const row = page.locator("tr").filter({ hasText: filename }).first();
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: /复制链接|Copy/i }).click();

  const clipboardText = await page.evaluate(async () => {
    return navigator.clipboard.readText();
  });
  expect(clipboardText).toContain("/api/uploads/");
  expect(clipboardText).toContain("/download");
  await captureStepScreenshot(page, testInfo, "dashboard-uploads-link-copied");
});

test.skip("/dashboard/uploads 打开按钮会触发下载跳转", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  await signInAsDebugUser(page, "/");

  const filename = `e2e-upload-${Date.now()}.txt`;
  const createResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/uploads") &&
      response.request().method() === "POST" &&
      response.status() === 200,
  );
  const completeResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/uploads/complete") &&
      response.request().method() === "POST" &&
      response.status() >= 200,
  );
  await page.locator("input#upload-file").setInputFiles({
    name: filename,
    mimeType: "text/plain",
    buffer: Buffer.from("download"),
  });
  await createResponse;
  const complete = await completeResponse;
  expect(complete.status()).toBe(200);
  await page.waitForLoadState("networkidle");

  const row = page.locator("tr").filter({ hasText: filename }).first();
  await expect(row).toBeVisible();

  await page.evaluate(() => {
    (window as any).__openedUrls = [];
    window.open = (url?: string | URL) => {
      if (url != null) (window as any).__openedUrls.push(String(url));
      return null;
    };
  });

  await row.getByRole("button", { name: /打开|Open/i }).click();

  await expect
    .poll(async () =>
      page.evaluate(() => (window as any).__openedUrls?.[0] ?? ""),
    )
    .toMatch(/\/api\/uploads\/.+\/download/);
  await captureStepScreenshot(page, testInfo, "dashboard-uploads-open-clicked");
});

test.skip("/dashboard/uploads 可确认删除新上传文件", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  await signInAsDebugUser(page, "/");

  const filename = `e2e-upload-${Date.now()}.txt`;
  const createResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/uploads") &&
      response.request().method() === "POST" &&
      response.status() === 200,
  );
  const completeResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/uploads/complete") &&
      response.request().method() === "POST" &&
      response.status() >= 200,
  );
  await page.locator("input#upload-file").setInputFiles({
    name: filename,
    mimeType: "text/plain",
    buffer: Buffer.from("delete"),
  });
  await createResponse;
  const complete = await completeResponse;
  expect(complete.status()).toBe(200);
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(filename).first()).toBeVisible();

  const row = page.locator("tr").filter({ hasText: filename }).first();
  await row.getByRole("button", { name: /删除|Delete/i }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await captureStepScreenshot(
    page,
    testInfo,
    "dashboard-uploads-delete-confirm",
  );

  const deleteResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/uploads/") &&
      response.request().method() === "DELETE" &&
      response.status() === 200,
  );
  await dialog.getByRole("button", { name: /删除|Delete/i }).click();
  await deleteResponse;
  await page.waitForLoadState("networkidle");
  await expect(page.locator("tr").filter({ hasText: filename })).toHaveCount(0);
  await captureStepScreenshot(page, testInfo, "dashboard-uploads-deleted");
});

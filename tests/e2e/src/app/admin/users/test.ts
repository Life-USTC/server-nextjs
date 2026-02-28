import { expect, test } from "@playwright/test";
import { signInAsDebugUser, signInAsDevAdmin } from "../../../../utils/auth";
import { DEV_SEED } from "../../../../utils/dev-seed";
import { gotoAndWaitForReady } from "../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../utils/screenshot";

test("/admin/users 未登录重定向到登录页", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/admin/users", {
    expectMainContent: false,
  });

  await expect(page).toHaveURL(/\/signin(?:\?.*)?$/);
  await expect(page.getByRole("button", { name: /USTC/i })).toBeVisible();
  await captureStepScreenshot(page, testInfo, "admin-users-unauthorized");
});

test("/admin/users 普通用户访问返回 404", async ({ page }, testInfo) => {
  await signInAsDebugUser(page, "/admin/users", "/admin/users");
  await expect(page.locator("h1")).toHaveText("404");
  await captureStepScreenshot(page, testInfo, "admin-users-404");
});

test("/admin/users 管理员可看到 seed 用户", async ({ page }, testInfo) => {
  await signInAsDevAdmin(page, "/admin/users");

  await expect(page).toHaveURL(/\/admin\/users(?:\?.*)?$/);
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(page.getByText(DEV_SEED.debugUsername).first()).toBeVisible();
  await expect(page.getByText("dev-admin").first()).toBeVisible();
  await captureStepScreenshot(page, testInfo, "admin-users-seed");
});

test("/admin/users 搜索表单可过滤用户", async ({ page }, testInfo) => {
  await signInAsDevAdmin(page, "/admin/users");

  await page.getByRole("searchbox").fill(DEV_SEED.debugUsername);
  await page.getByRole("button", { name: /搜索|Search/i }).click();

  await expect(page).toHaveURL(new RegExp(`search=${DEV_SEED.debugUsername}`));
  await expect(page.getByText(DEV_SEED.debugUsername).first()).toBeVisible();
  await captureStepScreenshot(page, testInfo, "admin-users-search");

  const clearButton = page.getByRole("button", { name: /清除|Clear/i }).first();
  if ((await clearButton.count()) > 0) {
    await clearButton.click();
    await expect(page).toHaveURL(/\/admin\/users(?:\?.*)?$/);
    await captureStepScreenshot(page, testInfo, "admin-users-clear");
  }
});

test("/admin/users 用户名非法保存返回 400", async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await signInAsDevAdmin(page, "/admin/users");

  const row = page
    .locator("tr")
    .filter({ hasText: DEV_SEED.debugUsername })
    .first();
  await expect(row).toBeVisible();
  await row.click();

  const dialog = page.getByRole("dialog", { name: /管理用户|Manage User/i });
  await expect(dialog).toBeVisible();

  const usernameInput = dialog.getByPlaceholder(/用户名|Username/i).first();
  await expect(usernameInput).toBeVisible();
  await usernameInput.fill("INVALID");

  const saveResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/admin/users/") &&
      response.request().method() === "PATCH" &&
      response.status() === 400,
  );
  await dialog.getByRole("button", { name: /保存更改|Save/i }).click();
  await saveResponse;
  await captureStepScreenshot(page, testInfo, "admin-users-invalid-username");
});

test("/admin/users 可打开管理弹窗并保存姓名", async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await signInAsDevAdmin(page, "/admin/users");

  const row = page.locator("tr").filter({ hasText: "dev-admin" }).first();
  await expect(row).toBeVisible();
  await row.click();

  const dialog = page.getByRole("dialog", { name: /管理用户|Manage User/i });
  await expect(dialog).toBeVisible();

  const nameInput = dialog.getByPlaceholder(/姓名|Name/i).first();
  const originalName = await nameInput.inputValue();
  const newName = `e2e-${Date.now()}`;
  await nameInput.fill(newName);

  const saveResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/admin/users/") &&
      response.request().method() === "PATCH",
  );
  await dialog.getByRole("button", { name: /保存更改|Save/i }).click();
  const save = await saveResponse;
  expect(save.status()).toBe(200);
  await page.waitForLoadState("networkidle");
  await captureStepScreenshot(page, testInfo, "admin-users-updated");

  await row.click();
  const dialog2 = page.getByRole("dialog", { name: /管理用户|Manage User/i });
  await expect(dialog2).toBeVisible();
  const nameInput2 = dialog2.getByPlaceholder(/姓名|Name/i).first();
  await nameInput2.fill(originalName);
  const rollbackResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/admin/users/") &&
      response.request().method() === "PATCH",
  );
  await dialog2.getByRole("button", { name: /保存更改|Save/i }).click();
  const rollback = await rollbackResponse;
  expect(rollback.status()).toBe(200);
});

test("/admin/users 可用自定义到期时间创建封禁并解除", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  await signInAsDevAdmin(page, "/admin/users");

  const row = page.locator("tr").filter({ hasText: "dev-admin" }).first();
  await expect(row).toBeVisible();
  await row.click();

  const dialog = page.getByRole("dialog", { name: /管理用户|Manage User/i });
  await expect(dialog).toBeVisible();

  const durationSelect = dialog.getByRole("combobox").first();
  if ((await durationSelect.count()) > 0) {
    await durationSelect.click();
    const customOption = page
      .getByRole("option", { name: /自定义|Custom/i })
      .first();
    if ((await customOption.count()) > 0) {
      await customOption.click();
    } else {
      await page.keyboard.press("Escape");
    }
  }

  const expiresAtInput = dialog.locator('input[type="datetime-local"]').first();
  if ((await expiresAtInput.count()) > 0) {
    await expect(expiresAtInput).toBeVisible();
    await expiresAtInput.fill("2030-01-01T00:00");
  }

  const reason = `e2e-suspend-${Date.now()}`;
  const reasonInput = dialog.getByPlaceholder(/原因|Reason/i).first();
  if ((await reasonInput.count()) > 0) {
    await reasonInput.fill(reason);
  }

  let suspendButton = dialog
    .getByRole("button", { name: /封禁|Suspend|Ban/i })
    .first();
  if ((await suspendButton.count()) === 0) {
    suspendButton = dialog.locator('button[class*="bg-destructive"]').first();
  }
  await expect(suspendButton).toBeVisible();

  await suspendButton.click({ force: true });

  let suspensionId: string | null = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const listResponse = await page.request.get("/api/admin/suspensions");
    expect(listResponse.status()).toBe(200);
    const listBody = (await listResponse.json()) as {
      suspensions?: Array<{ id?: unknown; reason?: string | null }>;
    };
    const match = listBody.suspensions?.find((item) => item.reason === reason);
    if (typeof match?.id === "string" || typeof match?.id === "number") {
      suspensionId = String(match.id);
      break;
    }
    if (match?.id && typeof match.id === "object") {
      const nestedId = (match.id as { id?: unknown }).id;
      if (typeof nestedId === "string" || typeof nestedId === "number") {
        suspensionId = String(nestedId);
        break;
      }
      const toStringId =
        typeof (match.id as { toString?: unknown }).toString === "function"
          ? String(match.id)
          : null;
      if (toStringId && toStringId !== "[object Object]") {
        suspensionId = toStringId;
        break;
      }
    }
    if (match?.id != null) {
      suspensionId = String(match.id);
      break;
    }
    await page.waitForTimeout(300);
  }
  expect(typeof suspensionId).toBe("string");
  await captureStepScreenshot(page, testInfo, "admin-users-suspended-custom");

  const lift = await page.request.patch(
    `/api/admin/suspensions/${suspensionId}`,
  );
  expect(lift.status()).toBe(200);
});

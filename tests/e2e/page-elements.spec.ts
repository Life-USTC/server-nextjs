import { expect, type Page, test } from "@playwright/test";
import { signInAsDebugUser } from "./utils/auth";

test.describe.configure({ timeout: 60_000 });

async function expectTableOrEmpty(page: Page) {
  const table = page.locator("table").first();
  if ((await table.count()) > 0) {
    await expect(table).toBeVisible();
    return;
  }

  await expect(page.locator('[data-slot="empty"]').first()).toBeVisible();
}

test.describe("公共页面元素与高级功能", () => {
  test("sections 列表支持搜索并正确回填参数", async ({ page }) => {
    await page.goto("/sections");

    await expect(page.locator('input[name="search"]')).toBeVisible();
    await expectTableOrEmpty(page);

    await page.locator('input[name="search"]').fill("ssr-query");
    await page.locator('input[name="search"]').press("Enter");

    await expect(page).toHaveURL(/\/sections\?.*search=ssr-query/);
    await expect(page.locator('input[name="search"]')).toHaveValue("ssr-query");
  });

  test("teachers 列表支持搜索并正确回填参数", async ({ page }) => {
    await page.goto("/teachers");

    await expect(page.locator('input[name="search"]')).toBeVisible();
    await expectTableOrEmpty(page);

    await page.locator('input[name="search"]').fill("e2e-teacher");
    await page.locator('input[name="search"]').press("Enter");

    await expect(page).toHaveURL(/\/teachers\?.*search=e2e-teacher/);
    await expect(page.locator('input[name="search"]')).toHaveValue(
      "e2e-teacher",
    );
  });

  test("courses 列表支持搜索并正确回填参数", async ({ page }) => {
    await page.goto("/courses");

    await expect(page.locator('input[name="search"]')).toBeVisible();
    await expectTableOrEmpty(page);

    await page.locator('input[name="search"]').fill("e2e-course");
    await page.locator('input[name="search"]').press("Enter");

    await expect(page).toHaveURL(/\/courses\?.*search=e2e-course/);
    await expect(page.locator('input[name="search"]')).toHaveValue(
      "e2e-course",
    );
  });

  test("评论指南页面渲染 Markdown 样例", async ({ page }) => {
    await page.goto("/comments/guide");

    await expect(page.locator("pre").first()).toBeVisible();
    await expect(page.locator("table").first()).toBeVisible();
  });
});

test.describe("登录后页面元素与高级功能", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsDebugUser(page, "/dashboard");
  });

  test("dashboard 页面显示关键入口", async ({ page }) => {
    await expect(page.locator('a[href="/dashboard"]').first()).toBeVisible();
    await expect(
      page.locator('a[href="/dashboard/subscriptions/sections"]').first(),
    ).toBeVisible();
    await expect(
      page.locator('a[href="/dashboard/homeworks"]').first(),
    ).toBeVisible();
  });

  test("dashboard 左侧切换可在三个页面间导航", async ({ page }) => {
    await page.goto("/dashboard");
    await page
      .locator('a[href="/dashboard/subscriptions/sections"]')
      .first()
      .click();
    await expect(page).toHaveURL(
      /\/dashboard\/subscriptions\/sections(?:\?.*)?$/,
    );

    await page.locator('a[href="/dashboard/homeworks"]').first().click();
    await expect(page).toHaveURL(/\/dashboard\/homeworks(?:\?.*)?$/);

    await page.locator('a[href="/dashboard"]').first().click();
    await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/);
  });

  test("dashboard 子页面具备关键交互元素", async ({ page }) => {
    await page.goto("/dashboard/subscriptions/sections");
    await expect(page.locator("textarea")).toBeVisible();

    await page.goto("/dashboard/uploads");
    await expect(page.locator("input#upload-file")).toBeAttached();

    await page.goto("/dashboard/comments");
    await expect(page.locator("#main-content")).toBeVisible();

    await page.goto("/dashboard/homeworks");
    await expect(
      page.getByRole("button", { name: /未完成|Incomplete/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /已完成|Completed/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /添加作业|Add homework/i }).first(),
    ).toBeVisible();
  });

  test("settings 页面支持导航与重定向", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/settings\/profile$/);
    await expect(page.locator("input#name")).toBeVisible();
    await expect(page.locator("input#username")).toBeVisible();

    await page.goto("/settings/accounts");
    await expect(
      page.locator("span", { hasText: "GitHub" }).first(),
    ).toBeVisible();
    await expect(
      page.locator("span", { hasText: "Google" }).first(),
    ).toBeVisible();
    await expect(
      page.locator("span", { hasText: "USTC" }).first(),
    ).toBeVisible();

    await page.goto("/settings/content");
    await expect(
      page.locator('a[href="/dashboard/uploads"]:visible').first(),
    ).toBeVisible();
    await expect(
      page.locator('a[href="/dashboard/comments"]:visible').first(),
    ).toBeVisible();
  });

  test("危险操作页面仅在输入 DELETE 后可确认", async ({ page }) => {
    await page.goto("/settings/danger");

    const openDialogButton = page
      .getByRole("button")
      .filter({ hasText: /delete/i })
      .first();
    await openDialogButton.click();

    const confirmInput = page.locator('input[placeholder="DELETE"]');
    const dialog = page
      .locator('[role="dialog"]')
      .filter({ has: confirmInput });
    const confirmButton = dialog
      .locator('button:not([aria-label="Close"])')
      .last();

    await expect(confirmButton).toBeDisabled();
    await confirmInput.fill("DELETE");
    await expect(confirmButton).toBeEnabled();
  });

  test("登录用户支持公开个人页 ID 路由", async ({ page }) => {
    const sessionResponse = await page.request.get("/api/auth/session");
    const session = (await sessionResponse.json()) as {
      user?: { id?: string };
    };
    const userId = session.user?.id;

    if (userId) {
      await page.goto(`/u/id/${userId}`);
      await expect(page.locator("#main-content")).toBeVisible();
    }
  });
});

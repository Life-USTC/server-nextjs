/**
 * E2E tests for the Todos Tab (`?tab=todos`)
 *
 * ## Data Represented
 * - Seed todos: "[DEV-SCENARIO] 今天截止待办" (due today, incomplete) and
 *   "[DEV-SCENARIO] 已完成待办" (completed)
 * - Each todo card shows: title, priority badge, due date, hover completion button,
 *   and optional markdown content
 *
 * ## UI/UX Elements
 * - Filter toolbar: incomplete (default) / completed / all
 * - Completion button appears when hovering or focusing a todo card
 * - Add button opens a sheet form (title, priority, due date, content)
 * - Clicking a todo title opens an edit sheet with a delete button
 * - Todo cards display priority icons (high/medium/low)
 *
 * ## Edge Cases
 * - Unauthenticated users see public links view (todos tab is auth-only)
 * - Optimistic updates via useOptimistic for toggle/delete/add
 * - Empty state shown when filter yields no matching todos
 */
import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { DEV_SEED } from "../../../../utils/dev-seed";
import { gotoAndWaitForReady } from "../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../utils/screenshot";

test.describe("dashboard todos", () => {
  test("unauthenticated ?tab=todos shows public view", async ({
    page,
  }, testInfo) => {
    await gotoAndWaitForReady(page, "/?tab=todos");

    await expect(page).toHaveURL(/\/\?tab=todos$/);
    await expect(page.locator("#main-content")).toBeVisible();

    await expect(
      page.getByRole("link", { name: /^(网站|Websites)$/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^(登录|Sign in)$/i }),
    ).toBeVisible();

    await captureStepScreenshot(page, testInfo, "dashboard-todos-unauthorized");
  });

  test("authenticated shows seed todos", async ({ page }, testInfo) => {
    await signInAsDebugUser(page, "/?tab=todos");

    await expect(page.locator("#main-content")).toBeVisible();
    await expect(
      page.getByText(DEV_SEED.todos.dueTodayTitle).first(),
    ).toBeVisible();
    await expect(page.getByRole("switch")).toHaveCount(0);

    const card = page
      .locator('[data-slot="card"]')
      .filter({ hasText: DEV_SEED.todos.dueTodayTitle })
      .first();
    await expect(card).toBeVisible();
    const completionButton = card
      .getByRole("button", { name: /标记为完成|Mark as complete/i })
      .first();
    await expect(completionButton).toHaveCSS("opacity", "0");
    await card.hover();
    await expect(completionButton).toHaveCSS("opacity", "1");

    await captureStepScreenshot(page, testInfo, "dashboard-todos-seed");
  });

  test("completed filter shows completed todo", async ({ page }, testInfo) => {
    await signInAsDebugUser(page, "/?tab=todos");

    await page
      .getByRole("button", { name: /已完成|Completed/i })
      .first()
      .click();

    await expect(
      page.getByText(DEV_SEED.todos.completedTitle).first(),
    ).toBeVisible();

    await captureStepScreenshot(page, testInfo, "dashboard-todos-completed");
  });

  test("can create and delete a todo", async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await signInAsDebugUser(page, "/?tab=todos");

    const title = `e2e-dashboard-todo-${Date.now()}`;

    // Create a new todo via sheet form
    await page
      .getByRole("button", { name: /添加待办|Add Todo/i })
      .first()
      .click();
    await page.getByLabel(/标题|Title/i).fill(title);
    await page
      .getByRole("button", { name: /创建待办|Create Todo/i })
      .first()
      .click();

    await expect(page.getByText(title).first()).toBeVisible({
      timeout: 15_000,
    });
    await captureStepScreenshot(page, testInfo, "dashboard-todos-created");

    // Delete the todo via edit sheet
    await page.getByText(title).first().click();
    await page
      .getByRole("button", { name: /删除待办|Delete todo/i })
      .first()
      .click();

    await expect(page.getByText(title)).toHaveCount(0, { timeout: 15_000 });
    await captureStepScreenshot(page, testInfo, "dashboard-todos-deleted");
  });
});
